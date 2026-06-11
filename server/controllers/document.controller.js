import { Document } from "../models/Document.js";
import { auditService } from "../services/audit.service.js";
import prisma from "../lib/prisma.js";

export const getDocuments = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const docs = await Document.find({ projectId, isDeleted: false })
      .select("-versions")
      .sort({ updatedAt: -1 });

    res.status(200).json(docs);
  } catch (error) {
    next(error);
  }
};

export const getOrgDocuments = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    
    const userId = req.auth?.userId;
    const userRoleLevel = req.userRole; // from requireRole middleware

    // Fetch projects user has access to
    const isAdminOrOwner = userRoleLevel === "ADMIN" || userRoleLevel === "OWNER";
    const projectsQuery = { organizationId: orgId, isDeleted: false };
    if (!isAdminOrOwner) projectsQuery.members = { some: { userId } };
    
    const projects = await prisma.project.findMany({ where: projectsQuery, select: { id: true, name: true } });
    const projectIds = projects.map(p => p.id);
    const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));
    
    const docs = await Document.find({ projectId: { $in: projectIds }, isDeleted: false })
      .select("-versions")
      .sort({ updatedAt: -1 })
      .lean();

    const enrichedDocs = docs.map(doc => ({
      ...doc,
      projectName: projectMap[doc.projectId] || "Unknown Project"
    }));

    res.status(200).json(enrichedDocs);
  } catch (error) {
    next(error);
  }
};

export const getDocument = async (req, res, next) => {
  try {
    const { docId } = req.params;
    const userId = req.auth?.userId;

    const doc = await Document.findById(docId);
    if (!doc || doc.isDeleted) {
      return res.status(404).json({ error: "Document not found" });
    }


    res.status(200).json(doc);
  } catch (error) {
    next(error);
  }
};

export const createDocument = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, content = "" } = req.body;
    const userId = req.auth?.userId;

    if (!title) {
      return res.status(400).json({ error: "Document title is required" });
    }

    const doc = await Document.create({
      projectId,
      title,
      currentContent: content,
      updatedBy: userId,
      versions: [
        {
          version: 1,
          content,
          updatedBy: userId,
        },
      ],
    });

    await auditService.log({
      action: "DOCUMENT_CREATED",
      userId,
      projectId,
      metadata: { documentId: doc._id.toString(), title },
    });

    // Broadcast to project room
    const io = req.app.get("io");
    io.to(`project_${projectId}`).emit("DOCUMENT_CREATED", doc);

    res.status(201).json(doc);
  } catch (error) {
    next(error);
  }
};

export const updateDocument = async (req, res, next) => {
  try {
    const { projectId, docId } = req.params;
    const { title, content } = req.body;
    const userId = req.auth?.userId;

    const doc = await Document.findById(docId);
    if (!doc || doc.isDeleted) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Push a new version if content changed
    if (content !== undefined && content !== doc.currentContent) {
      const nextVersion = (doc.versions?.length || 0) + 1;
      doc.versions.push({
        version: nextVersion,
        content,
        updatedBy: userId,
      });
      doc.currentContent = content;
    }

    if (title !== undefined) {
      doc.title = title;
    }

    doc.updatedBy = userId;
    await doc.save();

    await auditService.log({
      action: "DOCUMENT_UPDATED",
      userId,
      projectId,
      metadata: { documentId: doc._id.toString(), title: doc.title, version: doc.versions.length },
    });

    // Broadcast to project room
    const io = req.app.get("io");
    io.to(`project_${projectId}`).emit("DOCUMENT_UPDATED", doc);

    res.status(200).json(doc);
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const { projectId, docId } = req.params;
    const userId = req.auth?.userId;

    const doc = await Document.findById(docId);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    doc.isDeleted = true;
    doc.deletedAt = new Date();
    await doc.save();

    await auditService.log({
      action: "DOCUMENT_DELETED",
      userId,
      projectId,
      metadata: { documentId: doc._id.toString(), title: doc.title },
    });

    // Broadcast to project room
    const io = req.app.get("io");
    io.to(`project_${projectId}`).emit("DOCUMENT_DELETED", { docId });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getDocumentVersions = async (req, res, next) => {
  try {
    const { docId } = req.params;

    const doc = await Document.findById(docId).select("title versions");
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.status(200).json({ title: doc.title, versions: doc.versions });
  } catch (error) {
    next(error);
  }
};
