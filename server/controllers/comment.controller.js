import prisma from "../lib/prisma.js";
import { auditService } from "../services/audit.service.js";

export const createComment = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;
    const { content } = req.body;
    const userId = req.auth?.userId;

    if (!content) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    // Verify task exists and belongs to this project
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.projectId !== projectId) {
      return res.status(404).json({ error: "Task not found" });
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        userId,
        content,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { user: true },
    });

    await auditService.log({
      action: "COMMENT_CREATED",
      userId,
      projectId,
      metadata: { taskId, commentId: comment.id },
    });

    // Broadcast to project room so task detail updates in real-time
    const io = req.app.get("io");
    const updatedTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: { include: { user: true } },
        comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
      },
    });
    io.to(`project_${projectId}`).emit("TASK_UPDATED", updatedTask);

    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const { projectId, taskId, commentId } = req.params;
    const userId = req.auth?.userId;

    const comment = await prisma.taskComment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Only the comment author or a Project Manager (or Org Admin) can delete
    if (comment.userId !== userId && !["ADMIN", "MANAGER"].includes(req.userProjectRole)) {
      return res.status(403).json({ error: "Cannot delete this comment" });
    }

    await prisma.taskComment.delete({ where: { id: commentId } });

    await auditService.log({
      action: "COMMENT_DELETED",
      userId,
      projectId,
      metadata: { taskId, commentId },
    });

    const io = req.app.get("io");
    const updatedTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: { include: { user: true } },
        comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
      },
    });
    io.to(`project_${projectId}`).emit("TASK_UPDATED", updatedTask);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
