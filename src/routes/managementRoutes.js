import express from "express";
import { registerAdmin, loginAdmin, getAdmins, updateAdmin, deleteAdmin } from "../controllers/managementController.js";

const router = express.Router();

// Admin login
router.post("/login", loginAdmin);

// CRUD for admins
router.post("/register", registerAdmin);
router.get("/", getAdmins);
router.put("/:id", updateAdmin);
router.delete("/:id", deleteAdmin);

export default router;
