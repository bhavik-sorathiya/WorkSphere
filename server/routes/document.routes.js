import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole, requireProjectRole } from "../middleware/rbac.middleware.js";
import {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentVersions,
  getOrgDocuments,
} from "../controllers/document.controller.js";

const router = express.Router();

// Get all documents for an organization
router.get("/:orgId/all-documents", requireAuth(), requireRole("MEMBER"), getOrgDocuments);

// Get all documents for a project
router.get("/:orgId/projects/:projectId/documents", requireAuth(), requireProjectRole("VIEWER"), getDocuments);

// Get single document
router.get("/:orgId/projects/:projectId/documents/:docId", requireAuth(), requireProjectRole("VIEWER"), getDocument);

// Create document (Member+)
router.post("/:orgId/projects/:projectId/documents", requireAuth(), requireProjectRole("MEMBER"), createDocument);

// Update document (Member+)
router.put("/:orgId/projects/:projectId/documents/:docId", requireAuth(), requireProjectRole("MEMBER"), updateDocument);

// Delete document - soft delete (Manager+)
router.delete("/:orgId/projects/:projectId/documents/:docId", requireAuth(), requireProjectRole("MANAGER"), deleteDocument);

// Get version history
router.get("/:orgId/projects/:projectId/documents/:docId/versions", requireAuth(), requireProjectRole("VIEWER"), getDocumentVersions);

export default router;
