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

// const moment = require("moment");

const getStats = async (req, res) => {
  try {
    const now = moment();

    // ------------------------------
    // Define precise time ranges
    // ------------------------------
    const startOfDay = now.clone().startOf("day").toDate();
    const endOfDay = now.clone().endOf("day").toDate();

    const startOfWeek = now.clone().startOf("isoWeek").toDate(); // Monday start
    const endOfWeek = now.clone().endOf("isoWeek").toDate();

    const startOfMonth = now.clone().startOf("month").toDate();
    const endOfMonth = now.clone().endOf("month").toDate();

    const startOfYear = now.clone().startOf("year").toDate();
    const endOfYear = now.clone().endOf("year").toDate();

    // ------------------------------
    // Only valid NSP categories
    // ------------------------------
    const validCategories = ["Normal", "Suspect", "Pathological"];

    // ------------------------------
    // Count scans in each period (all scans included)
    // ------------------------------
    const [daily, weekly, monthly, yearly] = await Promise.all([
      CTGScan.countDocuments({ date: { $gte: startOfDay, $lte: endOfDay } }),
      CTGScan.countDocuments({ date: { $gte: startOfWeek, $lte: endOfWeek } }),
      CTGScan.countDocuments({ date: { $gte: startOfMonth, $lte: endOfMonth } }),
      CTGScan.countDocuments({ date: { $gte: startOfYear, $lte: endOfYear } }),
    ]);

    // ------------------------------
    // Count only valid NSP scans for pie chart
    // ------------------------------
    const [normalCount, suspectCount, pathologicalCount] = await Promise.all([
      CTGScan.countDocuments({ ctgDetected: "Normal" }),
      CTGScan.countDocuments({ ctgDetected: "Suspect" }),
      CTGScan.countDocuments({ ctgDetected: "Pathological" }),
    ]);

    const totalNSP = normalCount + suspectCount + pathologicalCount;

    // Percentages for pie chart only (avoid invalid scans)
    const nspPercentages = totalNSP
      ? {
          Normal: ((normalCount / totalNSP) * 100).toFixed(1),
          Suspect: ((suspectCount / totalNSP) * 100).toFixed(1),
          Pathological: ((pathologicalCount / totalNSP) * 100).toFixed(1),
        }
      : { Normal: 0, Suspect: 0, Pathological: 0 };

    res.json({
      daily,
      weekly,
      monthly,
      yearly,
      nspStats: {
        Normal: normalCount,
        Suspect: suspectCount,
        Pathological: pathologicalCount,
      },
      nspPercentages,
      totalScans: daily + weekly + monthly + yearly, // or total NSP scans if needed
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};




module.exports = { createScan, listScans, getStats };
