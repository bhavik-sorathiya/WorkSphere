import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  userId: {
    type: String, // Maps to Clerk ID
    required: true,
  },
  projectId: {
    type: String, // Maps to Postgres Project ID
    required: false,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
