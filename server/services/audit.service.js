import { ActivityLog } from "../models/ActivityLog.js";

/**
 * Centralized Audit Service
 * Used to log all critical operations across the system to MongoDB.
 */
export const auditService = {
  /**
   * Logs an action to MongoDB
   * @param {Object} params
   * @param {string} params.action - The type of action (e.g., 'TASK_MOVED', 'PROJECT_CREATED', 'USER_REMOVED')
   * @param {string} params.userId - The Clerk ID of the user performing the action
   * @param {string} [params.projectId] - The Project ID (optional, if the action is project-specific)
   * @param {Object} [params.metadata] - Any additional JSON data describing the event
   */
  async log({ action, userId, projectId, metadata = {} }) {
    try {
      await ActivityLog.create({
        action,
        userId,
        projectId,
        metadata,
      });
      // Optionally emit a Socket.io event here if we want a live activity feed
    } catch (error) {
      console.error("[Audit Service] Failed to log activity:", error);
      // We usually do not want an audit log failure to crash the main request transaction
    }
  },
};
