// src/routes/scanRoutes.js
import express from "express";
import multer from "multer";
import { storage } from "../config/cloudinary.js";
import {
  createScan,
  listScans,
  getStats
} from "../controllers/scanController.js";

const router = express.Router();

// -------------------------
// Multer setup for Cloudinary
// -------------------------
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // max 10MB per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only .jpg, .jpeg, and .png files are allowed"));
    }
  },
});

// -------------------------
// Routes
// -------------------------

// Upload a CTG scan image
router.post("/postCTG", upload.single("ctgImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Call the controller function to save scan info to DB
    const scan = await createScan(req, res); 
    res.status(201).json({
      message: "CTG scan uploaded successfully",
      scan,
      fileUrl: req.file.path, // Cloudinary URL
    });
  } catch (err) {
    console.error("❌ Upload Error:", err.message);
    res.status(500).json({ message: "Server error during upload" });
  }
});

// List all scans
router.get("/scans", async (req, res) => {
  try {
    const scans = await listScans(req, res);
    res.json(scans);
  } catch (err) {
    console.error("❌ List Scans Error:", err.message);
    res.status(500).json({ message: "Server error fetching scans" });
  }
});

// Get scan statistics
router.get("/scans/stats", async (req, res) => {
  try {
    const stats = await getStats(req, res);
    res.json(stats);
  } catch (err) {
    console.error("❌ Stats Error:", err.message);
    res.status(500).json({ message: "Server error fetching stats" });
  }
});

export default router;
