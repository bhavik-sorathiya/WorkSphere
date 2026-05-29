import mongoose from "mongoose";

const documentVersionSchema = new mongoose.Schema({
  version: {
    type: Number,
    required: true,
  },
  content: {
    type: String, // Store rich text HTML or JSON
    default: "",
  },
  updatedBy: {
    type: String, // Maps to Clerk ID
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const documentSchema = new mongoose.Schema({
  projectId: {
    type: String, // Maps to Postgres Project ID
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  currentContent: {
    type: String,
    default: "",
  },
  versions: [documentVersionSchema],
  updatedBy: {
    type: String,
    required: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

export const Document = mongoose.model("Document", documentSchema);
