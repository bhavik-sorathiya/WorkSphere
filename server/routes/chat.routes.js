import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole, requireProjectRole } from "../middleware/rbac.middleware.js";
import { getChannels, getMessages, sendMessage, createChannel, getOrgChannels } from "../controllers/chat.controller.js";

const router = express.Router();

// Get all channels for an organization
router.get("/:orgId/all-channels", requireAuth(), requireRole("MEMBER"), getOrgChannels);

// Get all channels for a project
router.get("/:orgId/projects/:projectId/channels", requireAuth(), requireProjectRole("MEMBER"), getChannels);

// Create a new channel (requires MANAGER or above in project)
router.post("/:orgId/projects/:projectId/channels", requireAuth(), requireProjectRole("MANAGER"), createChannel);

// Get messages for a channel (with pagination)
router.get("/:orgId/projects/:projectId/channels/:channelId/messages", requireAuth(), requireProjectRole("MEMBER"), getMessages);

// Send a message (also broadcast via Socket.io)
router.post("/:orgId/projects/:projectId/channels/:channelId/messages", requireAuth(), requireProjectRole("MEMBER"), sendMessage);

export default router;
