import prisma from "../lib/prisma.js";

const ROLE_HIERARCHY = {
  OWNER: 5,
  ADMIN: 4,
  MANAGER: 3,
  MEMBER: 2,
  VIEWER: 1,
};

/**
 * Express middleware to enforce Role-Based Access Control
 * @param {string} requiredRole - Minimum role required (e.g. "ADMIN")
 */
export const requireRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      // The userId is set by Clerk's requireAuth() middleware
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Organization ID must be present in the request to check roles
      const orgId = req.params.orgId || req.body.orgId || req.query.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "Organization ID is required for RBAC" });
      }

      const userRole = await prisma.userOrganizationRole.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: orgId,
          },
        },
      });

      if (!userRole) {
        return res.status(403).json({ error: "Forbidden: Not a member of this organization" });
      }

      const userRoleLevel = ROLE_HIERARCHY[userRole.role];
      const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];

      if (userRoleLevel >= requiredRoleLevel) {
        // Attach user role info to req for downstream usage
        req.userRole = userRole.role;
        return next();
      } else {
        return res.status(403).json({ error: `Forbidden: Requires at least ${requiredRole} role` });
      }
    } catch (error) {
      console.error("RBAC Middleware Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
};

/**
 * Express middleware to enforce Project-Level Access Control
 * @param {string} requiredRole - Minimum project role required (e.g. "EDITOR")
 */
export const requireProjectRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const orgId = req.params.orgId || req.body.orgId || req.query.orgId;
      const projectId = req.params.projectId || req.body.projectId || req.query.projectId;

      if (!orgId || !projectId) {
        return res.status(400).json({ error: "Organization ID and Project ID are required for Project RBAC" });
      }

      // First, check Org Level Role (Owners and Admins get automatic full access)
      const orgRole = await prisma.userOrganizationRole.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
      });

      if (!orgRole) {
        return res.status(403).json({ error: "Forbidden: Not a member of this organization" });
      }

      req.userOrgRole = orgRole.role; // Attach to request

      if (orgRole.role === "OWNER" || orgRole.role === "ADMIN") {
        req.userProjectRole = "ADMIN"; // Treat them as project admins
        return next();
      }

      // If not Org Admin/Owner, verify Project Level Role
      const projectMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });

      if (!projectMember) {
        return res.status(403).json({ error: "Forbidden: Not a member of this project" });
      }

      const userRoleLevel = ROLE_HIERARCHY[projectMember.role];
      const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];

      if (userRoleLevel >= requiredRoleLevel) {
        req.userProjectRole = projectMember.role; // Attach to request
        return next();
      } else {
        return res.status(403).json({ error: `Forbidden: Requires at least ${requiredRole} role in this project` });
      }
    } catch (error) {
      console.error("Project RBAC Middleware Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
};
