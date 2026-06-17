import prisma from "../lib/prisma.js";
import { auditService } from "../services/audit.service.js";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { ActivityLog } from "../models/ActivityLog.js";
import crypto from "crypto";

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

export const createOrganization = async (req, res, next) => {
  try {
    const { name, allowMultipleWorkspaces } = req.body;
    const userId = req.auth?.userId;

    if (!userId || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Database Transaction
    const org = await prisma.$transaction(async (tx) => {
      // 1. Create Org
      const slug = generateSlug(name);
      const newOrg = await tx.organization.create({
        data: { name, slug },
      });

      // 2. Assign OWNER role
      await tx.userOrganizationRole.create({
        data: {
          userId,
          organizationId: newOrg.id,
          role: "OWNER",
        },
      });

      // 3. Initialize WorkspaceSettings
      await tx.workspaceSetting.create({
        data: {
          organizationId: newOrg.id,
          allowMultipleWorkspaces: allowMultipleWorkspaces !== undefined ? allowMultipleWorkspaces : true
        },
      });

      return newOrg;
    });

    await auditService.log({
      action: "ORGANIZATION_CREATED",
      userId,
      metadata: { orgId: org.id, name: org.name },
    });

    res.status(201).json(org);
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
      return res.status(409).json({ error: "A workspace with this name already exists. Please choose a different name." });
    }
    next(error);
  }
};

export const inviteUser = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { email, role, forceException } = req.body;
    const adminId = req.auth?.userId;

    if (!email || !role) {
      return res.status(400).json({ error: "Email and role are required" });
    }

    if (role === "OWNER") {
      return res.status(403).json({ error: "Cannot assign OWNER role via invite" });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      const existingRole = await prisma.userOrganizationRole.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: orgId,
          },
        },
      });
      if (existingRole) {
        return res.status(400).json({ error: "User is already a member of this organization" });
      }
    }

    // Check workspace settings for allowMultipleWorkspaces rule
    const workspaceSettings = await prisma.workspaceSetting.findUnique({
      where: { organizationId: orgId }
    });

    if (workspaceSettings && !workspaceSettings.allowMultipleWorkspaces && existingUser && role !== "VIEWER") {
      // If this org restricts multi-workspace users, ensure the invited user isn't already in another org
      const otherOrgCount = await prisma.userOrganizationRole.count({
        where: { 
          userId: existingUser.id, 
          organizationId: { not: orgId },
          role: { not: "VIEWER" }
        }
      });
      
      if (otherOrgCount > 0) {
        if (!forceException) {
          return res.status(409).json({ 
            error: "This user belongs to other workspaces. Since your workspace restricts this, inviting them will automatically grant them an exception. Proceed?",
            requiresExceptionConfirmation: true
          });
        }
      }
    }

    // Upsert OrganizationInvite
    const invite = await prisma.organizationInvite.upsert({
      where: {
        organizationId_email: {
          organizationId: orgId,
          email: normalizedEmail,
        },
      },
      update: { role, status: "PENDING", grantException: forceException || false },
      create: {
        organizationId: orgId,
        email: normalizedEmail,
        role,
        status: "PENDING",
        grantException: forceException || false,
      },
    });

    await auditService.log({
      action: "USER_INVITED",
      userId: adminId,
      metadata: { orgId, invitedEmail: normalizedEmail, role },
    });

    if (existingUser) {
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
      req.app.get("io").to(`user_${existingUser.id}`).emit("notification", {
        message: `You have been invited to join ${org?.name || 'an organization'}!`,
        type: "success"
      });
    }

    res.status(200).json(invite);
  } catch (error) {
    next(error);
  }
};

export const getMyInvites = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.email) {
      return res.status(200).json([]);
    }

    const invites = await prisma.organizationInvite.findMany({
      where: { email: user.email.toLowerCase(), status: "PENDING" },
      include: { organization: true },
    });

    const deniedRequests = await prisma.workspaceJoinRequest.findMany({
      where: { userId: user.id, status: "DECLINED" },
      include: { organization: { select: { name: true } } }
    });

    // Check if any invite is pending admin approval
    const pendingRequests = await prisma.workspaceJoinRequest.findMany({
      where: { userId: user.id, status: "PENDING" }
    });

    const enrichedInvites = invites.map(inv => ({
      ...inv,
      isPendingApproval: pendingRequests.some(pr => pr.targetOrgId === inv.organizationId)
    }));

    res.status(200).json({ invites: enrichedInvites, deniedRequests });
  } catch (error) {
    next(error);
  }
};

export const respondToInvite = async (req, res, next) => {
  try {
    const { inviteId } = req.params;
    const { accept } = req.body;
    const userId = req.auth?.userId;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.email) return res.status(404).json({ error: "User not found" });

    const invite = await prisma.organizationInvite.findUnique({ where: { id: inviteId } });
    if (!invite) return res.status(404).json({ error: "Invite not found" });

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) return res.status(403).json({ error: "Not authorized to respond to this invite" });
    if (invite.status !== "PENDING") return res.status(400).json({ error: "Invite already processed" });

    if (!accept) {
      await prisma.organizationInvite.update({
        where: { id: inviteId },
        data: { status: "DECLINED" },
      });
      return res.status(200).json({ success: true, status: "DECLINED" });
    }

    // Accept invite logic
    if (invite.role !== "VIEWER") {
      // Find current orgs that restrict multi-workspace and where user is NOT an admin/owner
      const userRoles = await prisma.userOrganizationRole.findMany({
        where: { userId: user.id },
        include: { organization: { include: { workspaceSettings: true } } }
      });

      const restrictedOrgs = userRoles.filter(ur => 
        ur.role !== "ADMIN" && 
        ur.role !== "OWNER" && 
        ur.role !== "VIEWER" && 
        ur.multiWorkspaceException === false &&
        ur.organization.workspaceSettings && 
        ur.organization.workspaceSettings.allowMultipleWorkspaces === false
      );

      if (restrictedOrgs.length > 0) {
        // Check if there's already an ACCEPTED request for this target org
        const existingApprovedRequests = await prisma.workspaceJoinRequest.findMany({
          where: {
            userId: user.id,
            targetOrgId: invite.organizationId,
            status: "ACCEPTED"
          }
        });

        // If not all restricted orgs have approved requests, we need to ask for permission
        const orgsNeedingPermission = restrictedOrgs.filter(ro => 
          !existingApprovedRequests.some(ar => ar.organizationId === ro.organizationId)
        );

        if (orgsNeedingPermission.length > 0) {
          const targetOrg = await prisma.organization.findUnique({ where: { id: invite.organizationId } });
          
          for (const ro of orgsNeedingPermission) {
            // Upsert a pending request so we don't spam multiple if they click multiple times
            await prisma.workspaceJoinRequest.findFirst({
              where: {
                userId: user.id,
                organizationId: ro.organizationId,
                targetOrgId: targetOrg.id,
                status: "PENDING"
              }
            }).then(async (existing) => {
              if (!existing) {
                await prisma.workspaceJoinRequest.create({
                  data: {
                    userId: user.id,
                    organizationId: ro.organizationId,
                    targetOrgId: targetOrg.id,
                    targetOrgName: targetOrg.name,
                    status: "PENDING"
                  }
                });
                
                // Notify the admins of that org
                const admins = await prisma.userOrganizationRole.findMany({
                  where: { organizationId: ro.organizationId, role: { in: ["ADMIN", "OWNER"] } }
                });
                for (const admin of admins) {
                  req.app.get("io").to(`user_${admin.userId}`).emit("notification", {
                    message: `${user.name || user.email} requested permission to join ${targetOrg.name}`,
                    type: "warning"
                  });
                }
              }
            });
          }

          return res.status(200).json({ 
            success: false, 
            status: "PERMISSION_REQUIRED", 
            message: "Permission requested from your organization admin(s)." 
          });
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.organizationInvite.update({
        where: { id: inviteId },
        data: { status: "ACCEPTED" },
      });
      await tx.userOrganizationRole.upsert({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: invite.organizationId,
          },
        },
        update: { role: invite.role, multiWorkspaceException: invite.grantException || false },
        create: {
          userId: user.id,
          organizationId: invite.organizationId,
          role: invite.role,
          multiWorkspaceException: invite.grantException || false,
        },
      });
    });

    await auditService.log({
      action: "INVITE_ACCEPTED",
      userId,
      metadata: { orgId: invite.organizationId, inviteId },
    });

    res.status(200).json({ success: true, status: "ACCEPTED" });
  } catch (error) {
    next(error);
  }
};

export const removeUser = async (req, res, next) => {
  try {
    const { orgId, userId: userToRemoveId } = req.params;
    const adminId = req.auth?.userId;

    // Guard: cannot remove the OWNER
    const targetRole = await prisma.userOrganizationRole.findUnique({
      where: {
        userId_organizationId: {
          userId: userToRemoveId,
          organizationId: orgId,
        },
      },
    });

    if (!targetRole) {
      return res.status(404).json({ error: "User is not a member of this organization" });
    }

    if (targetRole.role === "OWNER") {
      return res.status(403).json({ error: "Cannot remove the Owner of the organization" });
    }

    // Guard: cannot remove yourself
    if (userToRemoveId === adminId) {
      return res.status(403).json({ error: "Cannot remove yourself" });
    }

    // PostgreSQL Transaction or serial deletion to clean up project memberships first
    await prisma.$transaction(async (tx) => {
      // 1. Find all projects in the organization
      const orgProjects = await tx.project.findMany({
        where: { organizationId: orgId },
        select: { id: true },
      });

      const projectIds = orgProjects.map((p) => p.id);

      // 2. Delete user's task assignments and project memberships in this organization
      if (projectIds.length > 0) {
        // Find all tasks in these projects
        const projectTasks = await tx.task.findMany({
          where: { projectId: { in: projectIds } },
          select: { id: true },
        });
        const taskIds = projectTasks.map((t) => t.id);

        if (taskIds.length > 0) {
          await tx.taskAssignee.deleteMany({
            where: {
              userId: userToRemoveId,
              taskId: { in: taskIds },
            },
          });
        }

        await tx.projectMember.deleteMany({
          where: {
            userId: userToRemoveId,
            projectId: { in: projectIds },
          },
        });
      }

      // 3. Delete the organization role
      await tx.userOrganizationRole.delete({
        where: {
          userId_organizationId: {
            userId: userToRemoveId,
            organizationId: orgId,
          },
        },
      });
    });

    await auditService.log({
      action: "USER_REMOVED",
      userId: adminId,
      metadata: { orgId, removedUserId: userToRemoveId },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getOrganizations = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    const userOrgs = await prisma.userOrganizationRole.findMany({
      where: { userId },
      include: { 
        organization: {
          include: {
            projects: {
              select: { id: true, name: true, slug: true }
            }
          }
        } 
      },
    });
    res.status(200).json(userOrgs.map(uo => ({ ...uo.organization, myRole: uo.role })));
  } catch (error) {
    next(error);
  }
};

export const getOrganization = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const userId = req.auth?.userId;

    const [userOrg, projects] = await Promise.all([
      prisma.userOrganizationRole.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        include: {
          organization: {
            include: {
              userRoles: {
                select: { 
                  role: true, 
                  createdAt: true, 
                  user: { select: { id: true, name: true, email: true } } 
                },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      }),
      prisma.project.findMany({
        where: {
          organizationId: orgId,
          isDeleted: false,
        },
        include: {
          members: {
            where: { userId }
          },
          invites: {
            where: { userId }
          },
          _count: {
            select: { members: true }
          }
        },
        orderBy: { createdAt: "desc" },
      })
    ]);

    if (!userOrg) {
      return res.status(404).json({ error: "Organization not found or not a member" });
    }

    const enrichedOrg = {
      ...userOrg.organization,
      projects,
      members: userOrg.organization.userRoles.map((ur) => ({
        id: ur.user.id,
        name: ur.user.name,
        email: ur.user.email,
        role: ur.role,
      })),
      myRole: userOrg.role,
    };

    res.status(200).json(enrichedOrg);
  } catch (error) {
    next(error);
  }
};

export const getOrganizationActivity = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const userId = req.auth?.userId;


    const projects = await prisma.project.findMany({
      where: { organizationId: orgId },
      select: { id: true }
    });
    const projectIds = projects.map(p => p.id);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const activities = await ActivityLog.find({
      $or: [
        { projectId: { $in: projectIds } },
        { "metadata.orgId": orgId }
      ]
    }).sort({ timestamp: -1 }).skip(skip).limit(limit);

    const userIds = [...new Set(activities.map(a => a.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });
    const userMap = {};
    users.forEach(u => userMap[u.id] = u.name);

    const enrichedActivities = activities.map(a => {
      const act = a.toObject ? a.toObject() : a;
      return {
        ...act,
        userName: userMap[act.userId] || "Unknown User"
      };
    });

    res.status(200).json(enrichedActivities);
  } catch (error) {
    next(error);
  }
};

export const getUserTasks = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const userId = req.auth?.userId;


    const tasks = await prisma.task.findMany({
      where: {
        project: { organizationId: orgId },
        isDeleted: false,
        OR: [
          { assignees: { some: { userId } } },
          { assignees: { none: {} } }
        ]
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' }
    });

    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getOrgInvites = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const userId = req.auth?.userId;


    const invites = await prisma.organizationInvite.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(invites);
  } catch (error) {
    next(error);
  }
};

export const updateOrganization = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { name, allowGuestInvites, allowMultipleWorkspaces } = req.body;
    const userId = req.auth?.userId;

    if (allowMultipleWorkspaces === false) {
      // Find all MEMBER and MANAGER users in this organization
      const internalUsers = await prisma.userOrganizationRole.findMany({
        where: {
          organizationId: orgId,
          role: { in: ["MEMBER", "MANAGER"] }
        },
        select: { userId: true }
      });
      const internalUserIds = internalUsers.map(u => u.userId);

      if (internalUserIds.length > 0) {
        // Check if any of these users belong to other organizations with role > VIEWER
        const usersInOtherOrgsCount = await prisma.userOrganizationRole.groupBy({
          by: ['userId'],
          where: {
            userId: { in: internalUserIds },
            organizationId: { not: orgId },
            role: { not: "VIEWER" }
          }
        });

        if (usersInOtherOrgsCount.length > 0) {
          const userIdsToExempt = usersInOtherOrgsCount.map(u => u.userId);
          
          await prisma.userOrganizationRole.updateMany({
            where: {
              organizationId: orgId,
              userId: { in: userIdsToExempt }
            },
            data: {
              multiWorkspaceException: true
            }
          });
        }
      }
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: {
        name,
        workspaceSettings: {
          upsert: {
            create: { 
              allowGuestInvites,
              ...(allowMultipleWorkspaces !== undefined && { allowMultipleWorkspaces })
            },
            update: { 
              allowGuestInvites,
              ...(allowMultipleWorkspaces !== undefined && { allowMultipleWorkspaces })
            },
          }
        }
      },
      include: { workspaceSettings: true }
    });

    await auditService.log({
      action: "ORGANIZATION_UPDATED",
      userId,
      metadata: { orgId, updates: req.body }
    });

    res.status(200).json(org);
  } catch (error) {
    next(error);
  }
};

export const deleteOrganization = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const userId = req.auth?.userId;
    
    // We expect RBAC middleware to ensure the user is the OWNER of this org
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return res.status(404).json({ error: "Organization not found" });

    await prisma.organization.delete({ where: { id: orgId } });

    await auditService.log({
      action: "ORGANIZATION_DELETED",
      userId,
      metadata: { orgId, name: org.name }
    });

    res.status(200).json({ success: true, message: "Organization deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const toggleMemberException = async (req, res, next) => {
  try {
    const { orgId, userId: targetUserId } = req.params;
    const { multiWorkspaceException } = req.body;
    const adminId = req.auth?.userId;

    const targetRole = await prisma.userOrganizationRole.findUnique({
      where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } }
    });
    
    if (!targetRole) return res.status(404).json({ error: "User not found in organization" });
    if (targetRole.role === "OWNER") return res.status(403).json({ error: "Cannot modify exception for the OWNER role" });

    const updatedRole = await prisma.userOrganizationRole.update({
      where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
      data: { multiWorkspaceException }
    });

    await auditService.log({
      action: "USER_EXCEPTION_UPDATED",
      userId: adminId,
      metadata: { orgId, targetUserId, multiWorkspaceException }
    });

    res.status(200).json(updatedRole);
  } catch (error) {
    next(error);
  }
};

export const updateMemberRole = async (req, res, next) => {
  try {
    const { orgId, userId: targetUserId } = req.params;
    const { role, forceException } = req.body;
    const adminId = req.auth?.userId;

    if (role === "OWNER") {
      return res.status(403).json({ error: "Cannot assign OWNER role via this endpoint" });
    }
    
    // Check if target is owner
    const targetRole = await prisma.userOrganizationRole.findUnique({
      where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } }
    });
    
    if (!targetRole) return res.status(404).json({ error: "User not found in organization" });
    if (targetRole.role === "OWNER") return res.status(403).json({ error: "Cannot change the OWNER role" });

    // Multi-workspace restriction checks on role upgrade
    if (role !== "VIEWER" && targetRole.role === "VIEWER") {
      // 1. Check if THIS org restricts multi-workspace
      const workspaceSettings = await prisma.workspaceSetting.findUnique({
        where: { organizationId: orgId }
      });

      if (workspaceSettings && !workspaceSettings.allowMultipleWorkspaces && targetRole.multiWorkspaceException === false) {
        const otherOrgCount = await prisma.userOrganizationRole.count({
          where: { 
            userId: targetUserId, 
            organizationId: { not: orgId },
            role: { not: "VIEWER" }
          }
        });
        
        if (otherOrgCount > 0) {
          if (!forceException) {
            return res.status(409).json({ 
              error: "Cannot promote: User belongs to other workspaces. Proceeding will automatically grant them an exception from your exclusivity rules. Proceed?",
              requiresExceptionConfirmation: true
            });
          }
        }
      }

      // 2. Check if OTHER orgs restrict this user
      const userRoles = await prisma.userOrganizationRole.findMany({
        where: { userId: targetUserId, organizationId: { not: orgId } },
        include: { organization: { include: { workspaceSettings: true } } }
      });

      const restrictedByOtherOrgs = userRoles.some(ur => 
        ur.role !== "ADMIN" && 
        ur.role !== "OWNER" && 
        ur.role !== "VIEWER" && 
        ur.multiWorkspaceException === false &&
        ur.organization.workspaceSettings && 
        ur.organization.workspaceSettings.allowMultipleWorkspaces === false
      );

      if (restrictedByOtherOrgs) {
        return res.status(400).json({ error: "Cannot promote: User is restricted by another workspace they belong to." });
      }
    }

    // Multi-workspace restriction checks on role demotion
    if ((targetRole.role === "ADMIN" || targetRole.role === "OWNER") && (role === "MEMBER" || role === "MANAGER")) {
      const workspaceSettings = await prisma.workspaceSetting.findUnique({
        where: { organizationId: orgId }
      });

      if (workspaceSettings && !workspaceSettings.allowMultipleWorkspaces && targetRole.multiWorkspaceException === false) {
        const otherOrgCount = await prisma.userOrganizationRole.count({
          where: { 
            userId: targetUserId, 
            organizationId: { not: orgId },
            role: { not: "VIEWER" }
          }
        });
        
        if (otherOrgCount > 0) {
          if (!forceException) {
            return res.status(409).json({ 
              error: "Cannot demote: This user belongs to other workspaces. Since this organization enforces exclusivity, demoting them will automatically grant them an exception. Proceed?",
              requiresExceptionConfirmation: true
            });
          }
        }
      }
    }

    const updatedRole = await prisma.userOrganizationRole.update({
      where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
      data: { 
        role,
        ...(forceException && { multiWorkspaceException: true })
      }
    });

    await auditService.log({
      action: "USER_ROLE_UPDATED",
      userId: adminId,
      metadata: { orgId, targetUserId, newRole: role }
    });

    res.status(200).json(updatedRole);
  } catch (error) {
    next(error);
  }
};

export const revokeInvite = async (req, res, next) => {
  try {
    const { orgId, inviteId } = req.params;
    const adminId = req.auth?.userId;

    const invite = await prisma.organizationInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.organizationId !== orgId) {
      return res.status(404).json({ error: "Invite not found" });
    }

    await prisma.organizationInvite.delete({ where: { id: inviteId } });

    await auditService.log({
      action: "INVITE_REVOKED",
      userId: adminId,
      metadata: { orgId, inviteId, email: invite.email }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getJoinRequests = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const requests = await prisma.workspaceJoinRequest.findMany({
      where: { organizationId: orgId, status: "PENDING" },
      include: { user: { select: { name: true, email: true } } }
    });
    res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
};

export const respondToJoinRequest = async (req, res, next) => {
  try {
    const { orgId, requestId } = req.params;
    const { accept } = req.body;

    const request = await prisma.workspaceJoinRequest.findUnique({
      where: { id: requestId }
    });

    if (!request || request.organizationId !== orgId) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ error: "Request already processed" });
    }

    await prisma.workspaceJoinRequest.update({
      where: { id: requestId },
      data: { status: accept ? "ACCEPTED" : "DECLINED" }
    });

    if (accept) {
      // Automatically grant an exception in the source org so they don't need to ask again
      await prisma.userOrganizationRole.update({
        where: {
          userId_organizationId: {
            userId: request.userId,
            organizationId: orgId
          }
        },
        data: { multiWorkspaceException: true }
      });

      // Find the invite from the target org
      const invite = await prisma.organizationInvite.findFirst({
        where: {
          email: (await prisma.user.findUnique({ where: { id: request.userId } })).email,
          organizationId: request.targetOrgId,
          status: "PENDING"
        }
      });

      if (invite) {
        // FINAL VERIFICATION: Check if target org recently turned off multi-workspace
        const targetOrgSettings = await prisma.workspaceSetting.findUnique({
          where: { organizationId: request.targetOrgId }
        });
        
        if (targetOrgSettings && !targetOrgSettings.allowMultipleWorkspaces && invite.role !== "VIEWER") {
          // If the target org no longer allows multiple workspaces, we cannot fulfill this invite.
          // Because they are currently in `orgId` (the restricted one they just got permission from).
          await prisma.organizationInvite.update({
            where: { id: invite.id },
            data: { status: "DECLINED" }
          });
          req.app.get("io").to(`user_${request.userId}`).emit("notification", {
            message: `Your request to join ${request.targetOrgName} was approved, but that organization no longer accepts members from other workspaces.`,
            type: "error"
          });
          return res.status(400).json({ error: "Target organization no longer allows multiple workspaces. Invite aborted." });
        }

        // Automatically accept the invite since it's now approved
        await prisma.$transaction(async (tx) => {
          await tx.organizationInvite.update({
            where: { id: invite.id },
            data: { status: "ACCEPTED" }
          });
          await tx.userOrganizationRole.upsert({
            where: {
              userId_organizationId: {
                userId: request.userId,
                organizationId: request.targetOrgId,
              },
            },
            update: { role: invite.role },
            create: {
              userId: request.userId,
              organizationId: request.targetOrgId,
              role: invite.role,
            },
          });
        });
        
        req.app.get("io").to(`user_${request.userId}`).emit("notification", {
          message: `Your request to join ${request.targetOrgName} was approved!`,
          type: "success"
        });
      }
    } else {
      req.app.get("io").to(`user_${request.userId}`).emit("notification", {
        message: `Your request to join ${request.targetOrgName} was denied by your admin.`,
        type: "error"
      });
    }

    res.status(200).json({ success: true, status: accept ? "ACCEPTED" : "DECLINED" });
  } catch (error) {
    next(error);
  }
};
