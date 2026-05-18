import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import mongoose from "mongoose";
import prisma from "./lib/prisma.js";

import webhookRoutes from "./routes/webhook.routes.js";
import orgRoutes from "./routes/org.routes.js";
import projectRoutes from "./routes/project.routes.js";
import taskRoutes from "./routes/task.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import documentRoutes from "./routes/document.routes.js";
import searchRoutes from "./routes/search.routes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// ─── CORS Configuration ───
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173").split(",");

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  },
});

// Make io accessible to routes via req.app
app.set("io", io);

// ─── Security Middleware ───
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(compression());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// ─── Rate Limiters ───
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,                  // 500 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,                   // 30 auth-related requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
});

const mutationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 40,                   // 40 write operations per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many write requests, please slow down." },
});

app.use("/api", globalLimiter);

// Mount webhooks BEFORE express.json() so Svix can read the raw body
app.use("/api/webhooks", authLimiter, webhookRoutes);

app.use(express.json({ limit: "5mb" }));

// Apply mutation limiter to all write endpoints
app.use("/api", (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return mutationLimiter(req, res, next);
  }
  next();
});

// REST API Routes
app.use("/api/organizations", orgRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/organizations/:orgId/search", searchRoutes);

// Database Connections
const connectDB = async () => {
  try {
    // MongoDB Connection
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("✅ MongoDB connected successfully");
    } else {
      console.warn("⚠️  MONGODB_URI not set, skipping MongoDB connection");
    }

    // Prisma (Postgres) connects lazily, but we can force a connection test
    await prisma.$connect();
    console.log("✅ PostgreSQL connected via Prisma successfully");
  } catch (error) {
    console.error("❌ Database connection error:");
    console.error(error.message);
    console.warn("⚠️  Server will start, but MongoDB-dependent features (Chat, Docs, Audit) will fail until the IP is whitelisted in Atlas.");
  }
};

// Real-time WebSockets
io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  // Join a project room for real-time board updates
  socket.on("join_project", (projectId) => {
    socket.join(`project_${projectId}`);
  });

  // Join a channel room for chat
  socket.on("join_channel", (channelId) => {
    socket.join(`channel_${channelId}`);
  });

  // Join a personal room for direct notifications
  socket.on("join_user", (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔌 User disconnected:", socket.id);
  });
});

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
  });
});

// Graceful Shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    await mongoose.connection.close();
    console.log("✅ All connections closed. Goodbye.");
    process.exit(0);
  });
  // Force shutdown after 10s
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start Server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
});

export { io };
