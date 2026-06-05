import prisma from "../lib/prisma.js";
import { auditService } from "../services/audit.service.js";

export const getTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const tasks = await prisma.task.findMany({
      where: { projectId, isDeleted: false },
      include: {
        assignees: {
          include: { user: true },
        },
        comments: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, status = "TODO", priority = "MEDIUM", dueDate, assigneeIds = [] } = req.body;
    const userId = req.auth?.userId;

    if (!title) {
      return res.status(400).json({ error: "Task title is required" });
    }

    const task = await prisma.$transaction(async (tx) => {
      const newTask = await tx.task.create({
        data: {
          title,
          status,
          priority,
          dueDate: dueDate ? new Date(dueDate) : null,
          projectId,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      if (assigneeIds.length > 0) {
        const validUsers = await tx.user.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true },
        });
        const validUserIds = validUsers.map((u) => u.id);

        if (validUserIds.length > 0) {
          await tx.taskAssignee.createMany({
            data: validUserIds.map((uid) => ({
              taskId: newTask.id,
              userId: uid,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.task.findUnique({
        where: { id: newTask.id },
        include: {
          assignees: { include: { user: true } },
          comments: { include: { user: true } },
        },
      });
    });

    await auditService.log({
      action: "TASK_CREATED",
      userId,
      projectId,
      metadata: { taskId: task.id, title, status, priority },
    });

    // Broadcast to all clients viewing this project
    const io = req.app.get("io");
    io.to(`project_${projectId}`).emit("TASK_CREATED", task);

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatus = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;
    const { status } = req.body;
    const userId = req.auth?.userId;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask || existingTask.projectId !== projectId) {
      return res.status(404).json({ error: "Task not found" });
    }

    const oldStatus = existingTask.status;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status, updatedBy: userId },
      include: {
        assignees: { include: { user: true } },
        comments: { include: { user: true } },
      },
    });

    await auditService.log({
      action: "TASK_MOVED",
      userId,
      projectId,
      metadata: { taskId, oldStatus, newStatus: status },
    });

    // Broadcast real-time Kanban update
    const io = req.app.get("io");
    io.to(`project_${projectId}`).emit("TASK_UPDATED", updatedTask);

    res.status(200).json(updatedTask);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;
    const { title, priority, dueDate, status } = req.body;
    const userId = req.auth?.userId;

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask || existingTask.projectId !== projectId) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updateData = { updatedBy: userId };
    if (title !== undefined) updateData.title = title;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignees: { include: { user: true } },
        comments: { include: { user: true } },
      },
    });

    await auditService.log({
      action: "TASK_UPDATED",
      userId,
      projectId,
      metadata: { taskId, changes: updateData },
    });

    const io = req.app.get("io");
    io.to(`project_${projectId}`).emit("TASK_UPDATED", updatedTask);

    res.status(200).json(updatedTask);
  } catch (error) {
    next(error);
  }
};

export const assignTask = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;
    const { userId: assigneeId } = req.body;
    const managerId = req.auth?.userId;

    if (!assigneeId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Verify user is a project member
    const isMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: assigneeId } },
    });

    if (!isMember) {
      return res.status(400).json({ error: "User is not a member of this project" });
    }

    await prisma.taskAssignee.upsert({
      where: { taskId_userId: { taskId, userId: assigneeId } },
      update: {},
      create: { taskId, userId: assigneeId },
    });

    const updatedTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: { include: { user: true } },
        comments: { include: { user: true } },
      },
    });

    await auditService.log({
      action: "TASK_ASSIGNED",
      userId: managerId,
      projectId,
      metadata: { taskId, assigneeId },
    });

    const io = req.app.get("io");
    io.to(`project_${projectId}`).emit("TASK_UPDATED", updatedTask);

    res.status(200).json(updatedTask);
  } catch (error) {
    next(error);
  }
};

export const unassignTask = async (req, res, next) => {
  try {
    const { projectId, taskId, userId: assigneeId } = req.params;
    const managerId = req.auth?.userId;

    await prisma.taskAssignee.delete({
      where: { taskId_userId: { taskId, userId: assigneeId } },
    });

    const updatedTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: { include: { user: true } },
        comments: { include: { user: true } },
      },
    });

    await auditService.log({
      action: "TASK_UNASSIGNED",
      userId: managerId,
      projectId,
      metadata: { taskId, removedAssigneeId: assigneeId },
    });

    const io = req.app.get("io");
    io.to(`project_${projectId}`).emit("TASK_UPDATED", updatedTask);

    res.status(200).json(updatedTask);
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;
    const userId = req.auth?.userId;

    // Soft delete
    const deletedTask = await prisma.task.update({
      where: { id: taskId },
      data: { isDeleted: true, deletedAt: new Date(), updatedBy: userId },
    });

    await auditService.log({
      action: "TASK_DELETED",
      userId,
      projectId,
      metadata: { taskId, title: deletedTask.title },
    });

    const io = req.app.get("io");
    io.to(`project_${projectId}`).emit("TASK_DELETED", { taskId });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
