import express from "express";
import {
  registerAdmin,
  getAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  checkSuperAdminExistence,
  requireSuperAdmin,
  allowFirstTimeRegistration,
  loginAdmin,
  getCurrentAdmin
} from "../controllers/managementController.js";

const router = express.Router();

// Public routes
router.get("/super-admin-exists", checkSuperAdminExistence);
router.post("/login", loginAdmin);

// Registration - allows first-time without auth, requires super admin after
router.post("/register", allowFirstTimeRegistration, registerAdmin);

// Get current admin profile
router.get("/profile/me", getCurrentAdmin);

// Protected routes (require super admin for write operations after first setup)
router.get("/", getAdmins);
router.get("/:id", getAdminById);
router.put("/:id", requireSuperAdmin, updateAdmin);
router.delete("/:id", requireSuperAdmin, deleteAdmin);

export default router;