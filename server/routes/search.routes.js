import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { searchGlobal } from "../controllers/search.controller.js";

const router = express.Router({ mergeParams: true });

router.use(requireAuth());
router.use(requireRole("MEMBER"));

router.get("/", searchGlobal);

export default router;
