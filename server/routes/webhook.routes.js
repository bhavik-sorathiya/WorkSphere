import express from "express";
import { Webhook } from "svix";
import prisma from "../lib/prisma.js";

const router = express.Router();

// Clerk Webhook Endpoint
// Note: req.body must be raw Buffer for Svix signature verification.
router.post(
  "/clerk",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.warn("WEBHOOK_SECRET is not set. Skipping webhook verification.");
      return res.status(500).json({ error: "Webhook secret missing" });
    }

    const payload = req.body;
    const headers = req.headers;

    const svix_id = headers["svix-id"];
    const svix_timestamp = headers["svix-timestamp"];
    const svix_signature = headers["svix-signature"];

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ error: "Missing svix headers" });
    }

    const wh = new Webhook(WEBHOOK_SECRET);
    let evt;

    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return res.status(400).json({ error: "Invalid signature" });
    }

    const eventType = evt.type;
    console.log(`Received Clerk Webhook: ${eventType}`);

    try {
      if (eventType === "user.created" || eventType === "user.updated") {
        const { id, email_addresses, first_name, last_name } = evt.data;
        let email = email_addresses?.[0]?.email_address?.toLowerCase();
        if (!email) {
          email = `no-email-${id}@worksphere.local`;
        }
        
        const name = `${first_name || ""} ${last_name || ""}`.trim();

        await prisma.user.upsert({
          where: { id },
          update: { email, name },
          create: { id, email, name },
        });
        console.log(`Synced user ${id} to database.`);
      }

      if (eventType === "user.deleted") {
        const { id } = evt.data;
        await prisma.user.deleteMany({ where: { id } });
        console.log(`Deleted user ${id} from database (if existed).`);
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Database sync error during webhook:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
