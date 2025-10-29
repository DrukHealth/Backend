const mongoose = require("mongoose");

const ctgScanSchema = new mongoose.Schema({
  imageUrl: String,
  ctgDetected: String,
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CTGScan", ctgScanSchema);
