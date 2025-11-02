import express from "express";
import Record from "../models/record.model.js"; // adjust path if needed

const router = express.Router();

// GET all records
router.get("/", async (req, res) => {
  try {
    const records = await Record.find().sort({ scannedDate: -1, scanTime: -1 });
    res.json({ success: true, records });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update a record's features
router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const { features, classification, predictionValue } = req.body;

  try {
    const updatedRecord = await Record.findByIdAndUpdate(
      id,
      { features, classification, predictionValue },
      { new: true }
    );

    if (updatedRecord) res.json({ success: true, record: updatedRecord });
    else res.status(404).json({ success: false, message: "Record not found" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE a record
router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const deleted = await Record.findByIdAndDelete(id);
    if (deleted) res.json({ success: true });
    else res.status(404).json({ success: false, message: "Record not found" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
