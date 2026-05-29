import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  channelId: {
    type: String, // Maps to Postgres Channel ID
    required: true,
  },
  senderId: {
    type: String, // Maps to Clerk User ID
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export const Message = mongoose.model("Message", messageSchema);
