import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import {
  createScan,
  listScans,
  getStats,
  getAllCTGRecords,
} from "../controllers/scanController.js";

const router = express.Router();

// Temporary file storage (local)
const upload = multer({ dest: "uploads/" });

// Upload CTG image
router.post("/postCTG", upload.single("ctgImage"), createScan);

// List scans
router.get("/scans", listScans);

// Stats
router.get("/scans/stats", getStats);

// All scans
router.get("/scans/all", getAllCTGRecords);

export default router;
