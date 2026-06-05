import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole, requireProjectRole } from "../middleware/rbac.middleware.js";
import {
  getTasks,
  createTask,
  updateTaskStatus,
  updateTask,
  assignTask,
  unassignTask,
  deleteTask,
} from "../controllers/task.controller.js";

const router = express.Router();

// GET all tasks for a project (any project member can view)
router.get("/:orgId/projects/:projectId/tasks", requireAuth(), requireProjectRole("VIEWER"), getTasks);

// CREATE a task (Member+)
router.post("/:orgId/projects/:projectId/tasks", requireAuth(), requireProjectRole("MEMBER"), createTask);

// UPDATE task status — Kanban drag (Member+)
router.patch("/:orgId/projects/:projectId/tasks/:taskId/status", requireAuth(), requireProjectRole("MEMBER"), updateTaskStatus);

// UPDATE task details (Member+)
router.put("/:orgId/projects/:projectId/tasks/:taskId", requireAuth(), requireProjectRole("MEMBER"), updateTask);

// ASSIGN user to task (Member+)
router.post("/:orgId/projects/:projectId/tasks/:taskId/assign", requireAuth(), requireProjectRole("MEMBER"), assignTask);

// UNASSIGN user from task (Member+)
router.delete("/:orgId/projects/:projectId/tasks/:taskId/assign/:userId", requireAuth(), requireProjectRole("MEMBER"), unassignTask);

// DELETE task — soft delete (Manager+)
router.delete("/:orgId/projects/:projectId/tasks/:taskId", requireAuth(), requireProjectRole("MANAGER"), deleteTask);

export default router;
