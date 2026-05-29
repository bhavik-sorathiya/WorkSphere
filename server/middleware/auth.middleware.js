import { ClerkExpressRequireAuth, clerkClient } from "@clerk/clerk-sdk-node";
import prisma from "../lib/prisma.js";

const clerkAuth = ClerkExpressRequireAuth();

const syncedUsersCache = new Set();

/**
 * Custom authentication middleware wrapper.
 * Ensures the request is authenticated via Clerk and JIT syncs the user into PostgreSQL.
 */
export const requireAuth = () => {
  return [
    clerkAuth,
    async (req, res, next) => {
      try {
        const userId = req.auth?.userId;
        if (!userId) {
          return next();
        }

        // Fast path: if we've already synced this user in memory, skip DB check
        if (syncedUsersCache.has(userId)) {
          return next();
        }

        // Check if user already exists in DB
        const existingUser = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!existingUser) {
          console.log(`[JIT Sync] User ${userId} not found in database. Fetching details from Clerk...`);
          const user = await clerkClient.users.getUser(userId);
          
          let email = (user.emailAddresses?.[0]?.emailAddress || user.email_addresses?.[0]?.email_address)?.toLowerCase();
          if (!email) {
            email = `no-email-${userId}@worksphere.local`;
            console.warn(`[JIT Sync] User ${userId} has no email address. Using placeholder: ${email}`);
          }
          
          const firstName = user.firstName || user.first_name || "";
          const lastName = user.lastName || user.last_name || "";
          const name = `${firstName} ${lastName}`.trim() || "User";

          await prisma.user.upsert({
            where: { id: userId },
            update: { email, name },
            create: { id: userId, email, name },
          });
          console.log(`[JIT Sync] Successfully synced user ${userId} to database.`);
        }
        
        // Add to in-memory cache so we never query the DB for this user again during this server's lifespan
        syncedUsersCache.add(userId);
        
        next();
      } catch (error) {
        console.error("[JIT Sync] Error during user sync middleware:", error);
        next();
      }
    }
  ];
};
