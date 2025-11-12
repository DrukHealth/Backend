import express from "express";
import {
  registerAdmin,
  getAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin
} from "../controllers/managementController.js";

const router = express.Router();

// Make sure these routes match what your frontend is calling
router.post("/register", registerAdmin);
router.get("/", getAdmins);
router.get("/:id", getAdminById);
router.put("/:id", updateAdmin);
router.delete("/:id", deleteAdmin);

export default router;