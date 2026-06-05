import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole, requireProjectRole } from "../middleware/rbac.middleware.js";
import { createProject, getProject, getProjectBySlug, addProjectMember, updateProjectMemberRole, removeProjectMember, requestAccess, inviteUser, respondToInvite, updateProject, deleteProject } from "../controllers/project.controller.js";

const router = express.Router();

// Create Project (Requires ADMIN role in the target org)
router.post("/:orgId", requireAuth(), requireRole("ADMIN"), createProject);

// Member management
router.post("/:orgId/:projectId/members", requireAuth(), requireProjectRole("MANAGER"), addProjectMember);
router.patch("/:orgId/:projectId/members/:userId/role", requireAuth(), requireProjectRole("MANAGER"), updateProjectMemberRole);
router.delete("/:orgId/:projectId/members/:userId", requireAuth(), requireProjectRole("MANAGER"), removeProjectMember);

// Get single project details (requires Project VIEWER or Org Admin)
router.get("/:orgId/:projectId", requireAuth(), requireProjectRole("VIEWER"), getProject);

// Update project (rename, complete) (requires Project MANAGER)
router.put("/:orgId/:projectId", requireAuth(), requireProjectRole("MANAGER"), updateProject);

// Delete project (requires Project MANAGER)
router.delete("/:orgId/:projectId", requireAuth(), requireProjectRole("MANAGER"), deleteProject);

// Get single project by slug (Requires Org MEMBER at least)
router.get("/:orgId/by-slug/:projectSlug", requireAuth(), requireRole("MEMBER"), getProjectBySlug);

// Invites & Requests
router.post("/:orgId/:projectId/request-access", requireAuth(), requireRole("MEMBER"), requestAccess);
router.post("/:orgId/:projectId/invites", requireAuth(), requireProjectRole("MANAGER"), inviteUser);
router.post("/:orgId/:projectId/invites/:inviteId/respond", requireAuth(), respondToInvite);

export default router;
