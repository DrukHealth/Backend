import Scan from "../models/Scan.js";
import mongoose from "mongoose";

/**
 * Create a scan from web app.
 * In your web app, call this after the user uploads/initiates a CTG scan.
 */
export async function createScan(req, res) {
  const { patientId, result, source } = req.body;
  if (!patientId) return res.status(400).json({ ok: false, message: "patientId is required" });

  const scan = await Scan.create({
    patientId,
    result: result || "Normal",
    source: source || "web",
    performedBy: req.user.id,
    scannedAt: new Date()
  });

  res.status(201).json({ ok: true, scan });
}

export async function listScans(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const p = Math.max(parseInt(page), 1);
  const l = Math.min(Math.max(parseInt(limit), 1), 100);

  const [items, total] = await Promise.all([
    Scan.find().sort({ scannedAt: -1 }).skip((p - 1) * l).limit(l),
    Scan.countDocuments()
  ]);

  res.json({ ok: true, items, page: p, pages: Math.ceil(total / l), total });
}

/**
 * Stats endpoint: group by day/week/month/year using MongoDB dateTrunc (MongoDB 5.0+).
 * Query:
 *   /api/scans/stats?granularity=day&from=2025-01-01&to=2025-12-31
 *   granularity: day | week | month | year
 */
export async function getStats(req, res) {
  const { granularity = "day", from, to } = req.query;

  const valid = ["day", "week", "month", "year"];
  if (!valid.includes(granularity)) {
    return res.status(400).json({ ok: false, message: "granularity must be day|week|month|year" });
  }

  const match = {};
  if (from || to) {
    match.scannedAt = {};
    if (from) match.scannedAt.$gte = new Date(from);
    if (to) match.scannedAt.$lte = new Date(to);
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: {
          $dateTrunc: { date: "$scannedAt", unit: granularity, binSize: 1 }
        },
        count: { $sum: 1 }
      }
    },
    { $project: { _id: 0, periodStart: "$_id", count: 1 } },
    { $sort: { periodStart: 1 } }
  ];

  // Fallback if MongoDB < 5 (no $dateTrunc) — optional:
  // You can implement $dateToString format grouping by case.

  const data = await Scan.aggregate(pipeline);
  res.json({ ok: true, granularity, data });
}
