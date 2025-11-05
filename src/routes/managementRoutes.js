import express from "express";
import {
  registerAdmin,
  loginAdmin,
  getAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
} from "../controllers/managementController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerAdmin); // Public — only used to seed new admin
router.post("/login", loginAdmin);       // Public — returns JWT token

router.get("/", protect, getAdmins);          // List all admins
router.get("/:id", protect, getAdminById);    // Get one admin by ID
router.put("/:id", protect, updateAdmin);     // Update admin details
router.delete("/:id", protect, deleteAdmin);  // Delete admin

export default router;
