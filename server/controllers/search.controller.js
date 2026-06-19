import prisma from "../lib/prisma.js";
import { Document } from "../models/Document.js";
import { Message } from "../models/Message.js";

export const searchGlobal = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { q } = req.query;
    const userId = req.auth?.userId;

    if (!q || q.trim() === "") {
      return res.status(200).json([]);
    }

    const queryStr = q.trim();

    // 1. Check user role in org (populated by requireRole middleware)
    const userRole = req.userRole;
    const isAdminOrOwner = userRole === "ADMIN" || userRole === "OWNER";

    // 2. Get accessible project IDs for the user within this org
    let projectIds = [];
    if (isAdminOrOwner) {
      const projects = await prisma.project.findMany({
        where: { organizationId: orgId, isDeleted: false },
        select: { id: true }
      });
      projectIds = projects.map(p => p.id);
    } else {
      const memberships = await prisma.projectMember.findMany({
        where: { userId, project: { organizationId: orgId, isDeleted: false } },
        select: { projectId: true }
      });
      projectIds = memberships.map(m => m.projectId);
    }

    if (projectIds.length === 0) {
      return res.status(200).json([]);
    }

    // 3. Get accessible channel IDs for those projects
    const channels = await prisma.channel.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true, projectId: true }
    });
    const channelIds = channels.map(c => c.id);

    // 4. Run optimized parallel queries across Postgres & Mongo
    const [projects, tasks, docs, messages] = await Promise.all([
      // Postgres: Projects
      prisma.project.findMany({
        where: { 
          id: { in: projectIds },
          name: { contains: queryStr, mode: 'insensitive' }
        },
        take: 5,
        select: { id: true, name: true }
      }),
      // Postgres: Tasks
      prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          isDeleted: false,
          title: { contains: queryStr, mode: 'insensitive' }
        },
        take: 5,
        select: { id: true, title: true, projectId: true }
      }),
      // Mongo: Documents
      Document.find({
        projectId: { $in: projectIds },
        isDeleted: false,
        title: { $regex: queryStr, $options: 'i' }
      })
      .select("title projectId")
      .limit(5)
      .lean(),
      // Mongo: Messages
      Message.find({
        channelId: { $in: channelIds },
        content: { $regex: queryStr, $options: 'i' }
      })
      .select("content channelId")
      .limit(5)
      .lean()
    ]);

    // 5. Standardize results for UI
    const results = [];

    projects.forEach(p => {
      results.push({
        id: p.id,
        type: "Project",
        title: p.name,
        link: `/org/${orgId}/project/${p.id}`,
      });
    });

    tasks.forEach(t => {
      results.push({
        id: t.id,
        type: "Task",
        title: t.title,
        link: `/org/${orgId}/project/${t.projectId}?task=${t.id}`,
      });
    });

    docs.forEach(d => {
      results.push({
        id: d._id.toString(),
        type: "Document",
        title: d.title,
        link: `/org/${orgId}/project/${d.projectId}/docs?doc=${d._id.toString()}`,
      });
    });

    messages.forEach(m => {
      // Find the projectId for this channel
      const channel = channels.find(c => c.id === m.channelId);
      const projectId = channel?.projectId;
      
      // Truncate long messages
      let snippet = m.content.replace(/<[^>]+>/g, ''); // strip HTML if any
      if (snippet.length > 50) snippet = snippet.substring(0, 50) + "...";

      results.push({
        id: m._id.toString(),
        type: "Message",
        title: `"${snippet}"`,
        link: `/org/${orgId}/project/${projectId}/chat?channel=${m.channelId}&msg=${m._id.toString()}`,
      });
    });

    // Optionally sort results, or keep them grouped
    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
};
