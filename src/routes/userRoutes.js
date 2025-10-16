import { Router } from "express";
import { createAdmin, me } from "../controllers/userController.js";
import { requireAuth, attachUser } from "../middleware/auth.js";
import { onlySuperAdmin } from "../middleware/roles.js";

const router = Router();

router.get("/me", requireAuth, attachUser, me);
router.post("/", requireAuth, onlySuperAdmin, createAdmin);

export default router;
