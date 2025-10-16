import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createScan, listScans, getStats } from "../controllers/scanController.js";

const router = Router();

router.post("/", requireAuth, createScan);      // create a CTG scan record
router.get("/", requireAuth, listScans);        // list scans (paginated)
router.get("/stats", requireAuth, getStats);    // stats by day/week/month/year

export default router;
