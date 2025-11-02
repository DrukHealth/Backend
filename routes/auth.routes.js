import express from "express";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

// In-memory OTP storage (use Redis in production)
const otpStore = new Map();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==================== LOGIN ROUTE ====================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Find user in database
    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log(`✅ Login successful for ${trimmedEmail}`);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("❌ Error in login:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

// ==================== FORGOT PASSWORD - SEND OTP ====================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user exists
    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return res.status(404).json({ message: "User with this email does not exist" });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP with expiration
    otpStore.set(trimmedEmail, { otp, expiresAt });

    console.log(`🔑 OTP for ${trimmedEmail}: ${otp}`);

    // Send OTP via email
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: trimmedEmail,
      subject: "Password Reset OTP - Druk Health",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>You have requested to reset your password for Druk Health.</p>
            <p>Your OTP is:</p>
            <h1 style="background-color: #4CAF50; color: white; padding: 15px; text-align: center; border-radius: 5px; letter-spacing: 5px;">
              ${otp}
            </h1>
            <p style="color: #666;">This OTP will expire in 10 minutes.</p>
            <p style="color: #666;">If you didn't request this, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px;">Druk Health System</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: "OTP sent successfully to your email",
      email: trimmedEmail 
    });

  } catch (error) {
    console.error("❌ Error in forgot-password:", error);
    res.status(500).json({ message: "Server error while sending OTP" });
  }
});

// ==================== VERIFY OTP ====================
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const storedOTPData = otpStore.get(trimmedEmail);

    if (!storedOTPData) {
      return res.status(400).json({ message: "No OTP found for this email. Please request a new one." });
    }

    // Check if OTP expired
    if (Date.now() > storedOTPData.expiresAt) {
      otpStore.delete(trimmedEmail);
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Verify OTP
    if (storedOTPData.otp !== otp.trim()) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    console.log(`✅ OTP verified for ${trimmedEmail}`);

    // OTP verified successfully
    res.status(200).json({ 
      message: "OTP verified successfully",
      email: trimmedEmail 
    });

  } catch (error) {
    console.error("❌ Error in verify-otp:", error);
    res.status(500).json({ message: "Server error while verifying OTP" });
  }
});

// ==================== RESET PASSWORD ====================
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Verify OTP was validated (should exist in store)
    const storedOTPData = otpStore.get(trimmedEmail);
    if (!storedOTPData) {
      return res.status(400).json({ message: "Please verify OTP first" });
    }

    // Password validation
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Check if user exists
    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password in database
    user.password = hashedPassword;
    user.updatedAt = new Date();
    await user.save();

    // Clear OTP from store
    otpStore.delete(trimmedEmail);

    console.log(`✅ Password reset successful for ${trimmedEmail}`);

    res.status(200).json({ 
      message: "Password reset successfully",
      email: trimmedEmail 
    });

  } catch (error) {
    console.error("❌ Error in reset-password:", error);
    res.status(500).json({ message: "Server error while resetting password" });
  }
});

// ==================== CLEANUP EXPIRED OTPs ====================
// Cleanup expired OTPs every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
      console.log(`Cleaned up expired OTP for ${email}`);
    }
  }
}, 15 * 60 * 1000);

export default router;