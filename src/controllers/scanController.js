// import CTGScan from "../models/ctgScan.js";
// import moment from "moment";

// // 🟢 POST /api/postCTG
// export const createScan = async (req, res) => {
//   try {
//     if (!req.file || !req.file.path) {
//       return res.status(400).json({ message: "No image uploaded" });
//     }

//     const ctgDetected = req.body.result || "Normal";
//     const imageUrl = req.file.path;

//     const scan = new CTGScan({ imageUrl, ctgDetected });
//     await scan.save();

//     const io = req.app.get("io");
//     if (io) io.emit("new-scan", scan);

//     res.status(201).json({
//       message: "CTG Scan uploaded successfully!",
//       scan,
//     });
//   } catch (error) {
//     console.error("Error uploading CTG scan:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // 🟡 GET /api/scans
// export const listScans = async (req, res) => {
//   try {
//     const scans = await CTGScan.find().sort({ date: -1 });
//     res.json(scans);
//   } catch (error) {
//     console.error("Error listing scans:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // 🔵 GET /api/scans/stats
// export const getStats = async (req, res) => {
//   try {
//     const now = moment();

//     const startOfDay = now.clone().startOf("day").toDate();
//     const endOfDay = now.clone().endOf("day").toDate();

//     const startOfWeek = now.clone().startOf("isoWeek").toDate();
//     const endOfWeek = now.clone().endOf("isoWeek").toDate();

//     const startOfMonth = now.clone().startOf("month").toDate();
//     const endOfMonth = now.clone().endOf("month").toDate();

//     const startOfYear = now.clone().startOf("year").toDate();
//     const endOfYear = now.clone().endOf("year").toDate();

//     const [daily, weekly, monthly, yearly] = await Promise.all([
//       CTGScan.countDocuments({ date: { $gte: startOfDay, $lte: endOfDay } }),
//       CTGScan.countDocuments({ date: { $gte: startOfWeek, $lte: endOfWeek } }),
//       CTGScan.countDocuments({ date: { $gte: startOfMonth, $lte: endOfMonth } }),
//       CTGScan.countDocuments({ date: { $gte: startOfYear, $lte: endOfYear } }),
//     ]);

//     const [normalCount, suspectCount, pathologicalCount] = await Promise.all([
//       CTGScan.countDocuments({ ctgDetected: "Normal" }),
//       CTGScan.countDocuments({ ctgDetected: "Suspect" }),
//       CTGScan.countDocuments({ ctgDetected: "Pathological" }),
//     ]);

//     const totalNSP = normalCount + suspectCount + pathologicalCount;

//     const nspPercentages = totalNSP
//       ? {
//           Normal: ((normalCount / totalNSP) * 100).toFixed(1),
//           Suspect: ((suspectCount / totalNSP) * 100).toFixed(1),
//           Pathological: ((pathologicalCount / totalNSP) * 100).toFixed(1),
//         }
//       : { Normal: 0, Suspect: 0, Pathological: 0 };

//     res.json({
//       daily,
//       weekly,
//       monthly,
//       yearly,
//       nspStats: {
//         Normal: normalCount,
//         Suspect: suspectCount,
//         Pathological: pathologicalCount,
//       },
//       nspPercentages,
//       totalScans: daily + weekly + monthly + yearly,
//     });
//   } catch (error) {
//     console.error("Error getting stats:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };


import CTGScan from "../models/ctgScan.js";
import moment from "moment";

// 🟢 POST /api/postCTG
export const createScan = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const ctgDetected = req.body.result || "Normal";
    const imageUrl = req.file.path;

    const scan = new CTGScan({ imageUrl, ctgDetected });
    await scan.save();

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
export const listScans = async (req, res) => {
  try {
    const scans = await CTGScan.find().sort({ date: -1 });
    res.json(scans);
  } catch (error) {
    console.error("Error listing scans:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllCTGRecords = async (req, res) => {
  try {
    const scans = await CTGScan.find().sort({ date: -1 });

    res.json({
      total: scans.length,
      records: scans,
    });
  } catch (error) {
    console.error("Error fetching all records:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// 🔵 GET /api/scans/stats
export const getStats = async (req, res) => {
  try {
    const now = moment();

    const startOfDay = now.clone().startOf("day").toDate();
    const endOfDay = now.clone().endOf("day").toDate();

    const startOfWeek = now.clone().startOf("isoWeek").toDate();
    const endOfWeek = now.clone().endOf("isoWeek").toDate();

    const startOfMonth = now.clone().startOf("month").toDate();
    const endOfMonth = now.clone().endOf("month").toDate();

    const startOfYear = now.clone().startOf("year").toDate();
    const endOfYear = now.clone().endOf("year").toDate();

    const [daily, weekly, monthly, yearly] = await Promise.all([
      CTGScan.countDocuments({ date: { $gte: startOfDay, $lte: endOfDay } }),
      CTGScan.countDocuments({ date: { $gte: startOfWeek, $lte: endOfWeek } }),
      CTGScan.countDocuments({ date: { $gte: startOfMonth, $lte: endOfMonth } }),
      CTGScan.countDocuments({ date: { $gte: startOfYear, $lte: endOfYear } }),
    ]);

    const [normalCount, suspectCount, pathologicalCount] = await Promise.all([
      CTGScan.countDocuments({ ctgDetected: "Normal" }),
      CTGScan.countDocuments({ ctgDetected: "Suspect" }),
      CTGScan.countDocuments({ ctgDetected: "Pathological" }),
    ]);

    const totalNSP = normalCount + suspectCount + pathologicalCount;

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
      totalScans: daily + weekly + monthly + yearly,
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};
