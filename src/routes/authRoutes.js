import express from "express";
import {
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
  cleanupExpiredOtps, // optional
} from "../controllers/authController.js";

const router = express.Router();

// ----------------------
// Auth routes
// ----------------------

// Login route
router.post("/login", login);

// Forgot Password (send OTP)
router.post("/forgot-password", forgotPassword);

// Verify OTP
router.post("/verify-otp", verifyOtp);

// Reset password after OTP verification
router.post("/reset-password", resetPassword);

// Change password for logged-in user
router.post("/change-password", changePassword);

// Optional: Cleanup expired OTPs from memory
router.get("/cleanup-otps", cleanupExpiredOtps);

export default router;
