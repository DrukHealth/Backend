import express from "express";
import { 
  login, 
  changePassword, 
  sendOtp, 
  verifyOtp, 
  resetPassword 
} from "../controllers/authController.js";

const router = express.Router();

// 🔐 Authentication routes
router.post("/login", login);                  // Login
router.post("/change-password", changePassword); // Change password (authenticated)
router.post("/forgot-password", sendOtp);      // Request OTP for password reset
router.post("/verify-otp", verifyOtp);        // Verify OTP
router.post("/reset-password", resetPassword); // Reset password after OTP verified

export default router;
