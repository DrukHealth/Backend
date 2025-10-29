const CTGScan = require("../models/ctgScan");
const moment = require("moment");

const createScan = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const ctgDetected = req.body.result || "Normal";
    const imageUrl = req.file.path;

    const scan = new CTGScan({ imageUrl, ctgDetected });
    await scan.save();

    // ✅ Safe emit (only if io exists)
    const io = req.app.get("io");
    if (io) io.emit("new-scan", scan);

    res.status(201).json({
      message: "CTG Scan uploaded successfully!",
      scan,
    });
  } catch (error) {
    console.error("Error uploading CTG scan:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// 🟡 GET /api/scans
const listScans = async (req, res) => {
  try {
    const scans = await CTGScan.find().sort({ date: -1 });
    res.json(scans);
  } catch (error) {
    console.error("Error listing scans:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔵 GET /api/scans/stats
const getStats = async (req, res) => {
  try {
    const now = moment();
    const startOfDay = now.clone().startOf("day");
    const startOfWeek = now.clone().startOf("week");
    const startOfMonth = now.clone().startOf("month");
    const startOfYear = now.clone().startOf("year");

    const [daily, weekly, monthly, yearly] = await Promise.all([
      CTGScan.countDocuments({ date: { $gte: startOfDay.toDate() } }),
      CTGScan.countDocuments({ date: { $gte: startOfWeek.toDate() } }),
      CTGScan.countDocuments({ date: { $gte: startOfMonth.toDate() } }),
      CTGScan.countDocuments({ date: { $gte: startOfYear.toDate() } }),
    ]);

    res.json({ daily, weekly, monthly, yearly });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createScan, listScans, getStats };
