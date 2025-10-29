const express = require("express");
const multer = require("multer");
const { storage } = require("../config/cloudinary");
const { createScan, listScans, getStats } = require("../controllers/scanController");

const router = express.Router();
const upload = multer({ storage });

// ✅ Make sure the field name matches the frontend exactly:
router.post("/postCTG", upload.single("ctgImage"), createScan);

router.get("/scans", listScans);
router.get("/scans/stats", getStats);

module.exports = router;
