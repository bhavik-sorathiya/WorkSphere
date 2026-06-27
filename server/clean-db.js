import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function cleanDB() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected.");

    console.log("Deleting MongoDB data...");
    // Drop the entire database or collections
    const collections = Object.keys(mongoose.connection.collections);
    for (const collectionName of collections) {
      await mongoose.connection.collections[collectionName].deleteMany({});
      console.log(`Deleted all documents in MongoDB collection: ${collectionName}`);
    }
    
    // Also clear ActivityLog model manually if it hasn't been instantiated
    if (mongoose.models.ActivityLog) {
      await mongoose.models.ActivityLog.deleteMany({});
      console.log("Deleted all documents in ActivityLog");
    }

    console.log("Deleting PostgreSQL data...");
    // Reverse topological order of dependencies to avoid FK constraints
    await prisma.$transaction([
      prisma.noticeViewer.deleteMany(),
      prisma.notice.deleteMany(),
      prisma.attachment.deleteMany(),
      prisma.taskComment.deleteMany(),
      prisma.taskAssignee.deleteMany(),
      prisma.task.deleteMany(),
      prisma.channel.deleteMany(),
      prisma.projectInvite.deleteMany(),
      prisma.projectMember.deleteMany(),
      prisma.project.deleteMany(),
      prisma.organizationInvite.deleteMany(),
      prisma.workspaceJoinRequest.deleteMany(),
      prisma.workspaceSetting.deleteMany(),
      prisma.userOrganizationRole.deleteMany(),
      prisma.organization.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    console.log("PostgreSQL data deleted successfully.");

    console.log("Database clean up complete!");
    process.exit(0);
  } catch (err) {
    console.error("Error cleaning database:", err);
    process.exit(1);
  }
}

cleanDB();
