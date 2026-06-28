import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import {
  createOrganization,
  inviteUser,
  removeUser,
  getOrganizations,
  getOrganization,
  getMyInvites,
  respondToInvite,
  getOrganizationActivity,
  getUserTasks,
  getOrgInvites,
  updateOrganization,
  deleteOrganization,
  updateMemberRole,
  revokeInvite,
  getJoinRequests,
  respondToJoinRequest,
  toggleMemberException,
} from "../controllers/org.controller.js";
import {
  createNotice,
  getNotices,
  deleteNotice,
} from "../controllers/notice.controller.js";

const router = express.Router();

// Get user's organizations
router.get("/", requireAuth(), getOrganizations);

// Invites Management (Must be before /:orgId to avoid wildcard interception)
router.get("/my-invites", requireAuth(), getMyInvites);
router.post("/invites/:inviteId/respond", requireAuth(), respondToInvite);

// Get specific organization details
router.get("/:orgId", requireAuth(), requireRole("VIEWER"), getOrganization);

// Create Organization (Auto-assigns OWNER)
router.post("/", requireAuth(), createOrganization);

// Update Organization (Requires ADMIN role in the target org)
router.put("/:orgId", requireAuth(), requireRole("ADMIN"), updateOrganization);

// Delete Organization (Requires OWNER role)
router.delete("/:orgId", requireAuth(), requireRole("OWNER"), deleteOrganization);

// Invite User (Requires ADMIN role in the target org)
router.post("/:orgId/invites", requireAuth(), requireRole("ADMIN"), inviteUser);

// Revoke Invite (Requires ADMIN role in the target org)
router.delete("/:orgId/invites/:inviteId", requireAuth(), requireRole("ADMIN"), revokeInvite);

// Remove User (Requires ADMIN role in the target org)
router.delete("/:orgId/members/:userId", requireAuth(), requireRole("ADMIN"), removeUser);

// Update Member Role (Requires ADMIN role in the target org)
router.put("/:orgId/members/:userId/role", requireAuth(), requireRole("ADMIN"), updateMemberRole);

// Toggle Member Exception (Requires ADMIN role in the target org)
router.put("/:orgId/members/:userId/exception", requireAuth(), requireRole("ADMIN"), toggleMemberException);

// Activity and Tasks
router.get("/:orgId/activity", requireAuth(), requireRole("MEMBER"), getOrganizationActivity);
router.get("/:orgId/tasks", requireAuth(), requireRole("VIEWER"), getUserTasks);
router.get("/:orgId/invites", requireAuth(), requireRole("ADMIN"), getOrgInvites);

// Notices
router.post("/:orgId/notices", requireAuth(), requireRole("MANAGER"), createNotice);
router.get("/:orgId/notices", requireAuth(), getNotices);
router.delete("/:orgId/notices/:noticeId", requireAuth(), requireRole("MANAGER"), deleteNotice);

// Join Requests
router.get("/:orgId/join-requests", requireAuth(), requireRole("ADMIN"), getJoinRequests);
router.put("/:orgId/join-requests/:requestId", requireAuth(), requireRole("ADMIN"), respondToJoinRequest);

export default router;
