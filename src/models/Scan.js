import mongoose from "mongoose";

/**
 * Represents a CTG scan record.
 * `source` could be "web", "mobile", etc.
 * `result` could be "Normal", "Suspicious", "Pathological" (adapt to your labels).
 */
const scanSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    source: { type: String, default: "web" },
    result: { type: String, default: "Normal" },
    // If you upload files later, keep references/URLs here
    // fileUrl: String,
    // features: Object, // e.g., computed CTG features
    scannedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Index for time-based stats
scanSchema.index({ scannedAt: 1 });

export default mongoose.model("Scan", scanSchema);
