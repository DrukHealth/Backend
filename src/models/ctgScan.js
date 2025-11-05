import mongoose from "mongoose";

const ctgScanSchema = new mongoose.Schema({
  imageUrl: String,
  ctgDetected: String,
  date: { type: Date, default: Date.now },
});

const CTGScan = mongoose.model("CTGScan", ctgScanSchema);

export default CTGScan;
