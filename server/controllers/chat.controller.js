import prisma from "../lib/prisma.js";
import { Message } from "../models/Message.js";

export const getChannels = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const channels = await prisma.channel.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json(channels);
  } catch (error) {
    next(error);
  }
};

export const getOrgChannels = async (req, res, next) => {
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
    
    const channels = await prisma.channel.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "asc" },
      include: { project: { select: { name: true } } }
    });

    res.status(200).json(channels);
  } catch (error) {
    next(error);
  }
};

export const createChannel = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name } = req.body;
    const userId = req.auth?.userId;

    if (!name) {
      return res.status(400).json({ error: "Channel name is required" });
    }

    const channel = await prisma.channel.create({
      data: {
        projectId,
        name: name.toLowerCase().replace(/\s+/g, "-"),
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Broadcast to project room
    const io = req.app.get("io");
    io.to(`project_${projectId}`).emit("CHANNEL_CREATED", channel);

    res.status(201).json(channel);
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before;


    const query = { channelId };
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    // Enrich with user data from Postgres
    const userIds = [...new Set(messages.map((m) => m.senderId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const enriched = messages
      .reverse()
      .map((m) => ({
        ...m,
        sender: userMap[m.senderId] || { id: m.senderId, name: "Unknown", email: "" },
      }));

    res.status(200).json(enriched);
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { content } = req.body;
    const userId = req.auth?.userId;

    if (!content) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Save to MongoDB
    const message = await Message.create({
      channelId,
      senderId: userId,
      content,
    });

    // Get sender info from Postgres
    const sender = await prisma.user.findUnique({ where: { id: userId } });

    const enrichedMessage = {
      ...message.toObject(),
      sender: sender || { id: userId, name: "Unknown", email: "" },
    };

    // Broadcast via Socket.io
    const io = req.app.get("io");
    io.to(`channel_${channelId}`).emit("NEW_MESSAGE", enrichedMessage);

    res.status(201).json(enrichedMessage);
  } catch (error) {
    next(error);
  }
};
