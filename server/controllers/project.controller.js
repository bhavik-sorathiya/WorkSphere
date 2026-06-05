import prisma from "../lib/prisma.js";
import { auditService } from "../services/audit.service.js";
import crypto from "crypto";

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

export const createProject = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { name, members = [] } = req.body;
    const adminId = req.auth?.userId;

    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    // Include the creator automatically in the project members list
    if (!members.includes(adminId)) {
      members.push(adminId);
    }

    // PostgreSQL Transaction
    const project = await prisma.$transaction(async (tx) => {
      // 1. Create Project
      const slug = generateSlug(name);
      const newProject = await tx.project.create({
        data: {
          name,
          slug,
          organizationId: orgId,
          createdBy: adminId,
          updatedBy: adminId,
        },
      });

      // 2. Filter out member IDs that don't exist in the database to prevent foreign key errors
      const validUsers = await tx.user.findMany({
        where: { id: { in: members } },
        select: { id: true },
      });
      const validUserIds = validUsers.map((u) => u.id);

      const memberData = validUserIds.map((userId) => ({
        projectId: newProject.id,
        userId,
      }));

      if (memberData.length > 0) {
        await tx.projectMember.createMany({
          data: memberData,
          skipDuplicates: true,
        });
      }

      // 3. Initialize default Chat Channel
      await tx.channel.create({
        data: {
          projectId: newProject.id,
          name: "general",
          createdBy: adminId,
          updatedBy: adminId,
        },
      });

      return newProject;
    });

    // Central Audit Logging to MongoDB
    await auditService.log({
      action: "PROJECT_CREATED",
      userId: adminId,
      projectId: project.id,
      metadata: { orgId, name: project.name, membersAdded: members.length },
    });

    res.status(201).json(project);
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
      return res.status(409).json({ error: "A project with this name already exists in this workspace. Please choose a different name." });
    }
    next(error);
  }
};

export const getProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Run parallel queries to prevent massive nested joins that block the DB
    const [project, members, channels, tasks, invites, orgAdmins] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
      }),
      prisma.projectMember.findMany({
        where: { projectId },
        include: { user: true },
      }),
      prisma.channel.findMany({
        where: { projectId },
      }),
      prisma.task.findMany({
        where: { projectId, isDeleted: false },
        include: {
          assignees: { include: { user: true } },
          comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.projectInvite.findMany({
        where: { projectId, status: "PENDING" },
        include: { user: true }
      }),
      prisma.userOrganizationRole.findMany({
        where: { 
          organizationId: project.organizationId,
          role: { in: ["ADMIN", "OWNER"] }
        },
        include: { user: true }
      }),
    ]);

    if (!project || project.isDeleted) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Access is already verified by requireProjectRole middleware

    // Inject Org Admins/Owners into members array if not already present
    const explicitMemberIds = new Set(members.map(m => m.userId));
    
    orgAdmins?.forEach(admin => {
      if (!explicitMemberIds.has(admin.userId)) {
        members.push({
          id: `implicit-${admin.id}`,
          projectId: project.id,
          userId: admin.userId,
          role: "MANAGER", // They effectively have manager permissions
          createdAt: admin.createdAt,
          implicit: true, // Flag for the frontend
          user: admin.user
        });
      }
    });

    // Assemble the data
    const enrichedProject = {
      ...project,
      members,
      channels,
      tasks,
      invites: invites || [],
    };

    res.status(200).json(enrichedProject);
  } catch (error) {
    next(error);
  }
};

export const addProjectMember = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { userId, role = "EDITOR" } = req.body;

    if (!userId) return res.status(400).json({ error: "User ID is required" });

    // Validate if the user is part of the org
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      update: { role },
      create: { projectId, userId, role },
      include: { user: true },
    });

    res.status(200).json(member);
  } catch (error) {
    next(error);
  }
};

export const updateProjectMemberRole = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;
    const { role } = req.body;

    if (!role) return res.status(400).json({ error: "Role is required" });

    const member = await prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
      include: { user: true },
    });

    res.status(200).json(member);
  } catch (error) {
    next(error);
  }
};

export const removeProjectMember = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;

    await prisma.$transaction(async (tx) => {
      await tx.projectMember.delete({
        where: { projectId_userId: { projectId, userId } },
      });

      // Cascade remove from task assignees
      await tx.taskAssignee.deleteMany({
        where: { task: { projectId }, userId },
      });
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const requestAccess = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.auth?.userId;

    const existing = await prisma.projectInvite.findUnique({
      where: { projectId_userId: { projectId, userId } }
    });

    if (existing) {
      return res.status(400).json({ error: "Request or invite already exists" });
    }

    const request = await prisma.projectInvite.create({
      data: {
        projectId,
        userId,
        type: "REQUEST",
        status: "PENDING"
      }
    });

    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
};

export const inviteUser = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;

    const existing = await prisma.projectInvite.findUnique({
      where: { projectId_userId: { projectId, userId } }
    });

    if (existing) {
      return res.status(400).json({ error: "Request or invite already exists" });
    }

    const invite = await prisma.projectInvite.create({
      data: {
        projectId,
        userId,
        type: "INVITE",
        status: "PENDING"
      }
    });

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
    req.app.get("io").to(`user_${userId}`).emit("notification", {
      message: `You have been invited to join the project '${project?.name || 'Unknown'}'!`,
      type: "success"
    });

    res.status(201).json(invite);
  } catch (error) {
    next(error);
  }
};

export const respondToInvite = async (req, res, next) => {
  try {
    const { projectId, inviteId } = req.params;
    const { action } = req.body; // "ACCEPT" or "DECLINE"
    const userId = req.auth?.userId;

    const invite = await prisma.projectInvite.findUnique({
      where: { id: inviteId }
    });

    if (!invite || invite.projectId !== projectId) {
      return res.status(404).json({ error: "Invite not found" });
    }

    // Determine who can respond:
    // If it's an INVITE, the user being invited responds.
    // If it's a REQUEST, an admin/project member responds.
    if (invite.type === "INVITE" && invite.userId !== userId) {
      return res.status(403).json({ error: "Forbidden: You cannot respond to this invite" });
    }
    
    if (invite.type === "REQUEST") {
      const orgRole = await prisma.userOrganizationRole.findUnique({
        where: { userId_organizationId: { userId, organizationId: req.params.orgId } }
      });
      const userOrgRole = orgRole?.role;
      const isAdminOrOwner = userOrgRole === "ADMIN" || userOrgRole === "OWNER";
      
      const isProjectMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } }
      });

      if (!isAdminOrOwner && !isProjectMember) {
         return res.status(403).json({ error: "Forbidden: Only admins or project members can approve requests" });
      }
    }

    if (action === "ACCEPT") {
      await prisma.$transaction(async (tx) => {
        await tx.projectInvite.update({
          where: { id: inviteId },
          data: { status: "ACCEPTED" }
        });

        const existingMember = await tx.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: invite.userId } }
        });

        if (!existingMember) {
          await tx.projectMember.create({
            data: {
              projectId,
              userId: invite.userId,
              role: "MEMBER" // Default role
            }
          });
        }
      });
      res.status(200).json({ success: true, message: "Access granted" });
    } else if (action === "DECLINE") {
      await prisma.projectInvite.update({
        where: { id: inviteId },
        data: { status: "DECLINED" }
      });
      res.status(200).json({ success: true, message: "Request declined" });
    } else {
      res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    next(error);
  }
};

export const getProjectBySlug = async (req, res, next) => {
  try {
    const { orgId, projectSlug } = req.params;

    const project = await prisma.project.findUnique({
      where: {
        organizationId_slug: {
          organizationId: orgId,
          slug: projectSlug,
        },
      },
      select: { id: true, name: true, slug: true }
    });

    if (!project || project.isDeleted) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, isComplete, targetDate, expectedDate } = req.body;
    
    // requireProjectRole("MANAGER") middleware ensures only Managers/Admins can hit this
    const data = {};
    if (name !== undefined) data.name = name;
    if (isComplete !== undefined) data.isComplete = isComplete;
    if (targetDate !== undefined) data.targetDate = targetDate ? new Date(targetDate) : null;
    if (expectedDate !== undefined) data.expectedDate = expectedDate ? new Date(expectedDate) : null;
    if (isComplete !== undefined) {
      // Validate tasks
      if (isComplete) {
        const incompleteTasks = await prisma.task.count({
          where: { projectId, status: { not: "DONE" }, isDeleted: false }
        });
        if (incompleteTasks > 0) {
          return res.status(400).json({ 
            error: `Project has ${incompleteTasks} incomplete tasks. Review them before completing.` 
          });
        }
      }
      data.isComplete = isComplete;
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data
    });

    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    // Soft delete
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { isDeleted: true }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
