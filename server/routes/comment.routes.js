import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole, requireProjectRole } from "../middleware/rbac.middleware.js";
import { createComment, deleteComment } from "../controllers/comment.controller.js";

const router = express.Router();

// Create comment on a task (any member can comment)
router.post("/:orgId/projects/:projectId/tasks/:taskId/comments", requireAuth(), requireProjectRole("MEMBER"), createComment);

// Delete comment (author or Manager+)
router.delete("/:orgId/projects/:projectId/tasks/:taskId/comments/:commentId", requireAuth(), requireProjectRole("MEMBER"), deleteComment);

export default router;
