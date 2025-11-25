// controllers/authController.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import Admin from "../models/managementModel.js";
import dotenv from "dotenv";

dotenv.config();

const DEBUG_LOG_OTPS = process.env.DEBUG_LOG_OTPS === "true"; // set true only in dev

// --------------------
// OTP store with expiry + cooldown
// Structure: otpStore.set(email, { otp, expiresAt: Date, cooldownUntil: Date, timeoutId })
// --------------------
const otpStore = new Map();

/** helper to normalize email */
function normalizeEmail(raw) {
  return (raw || "").toString().trim().toLowerCase();
}

// --------------------
// Nodemailer Transport
// --------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS, // must be app password with NO spaces
  },
});

// Verify SMTP config at startup (logs error if bad)
transporter.verify((err, success) => {
  if (err) {
    console.error("[authController] SMTP verify failed:", err);
  } else {
    console.log("[authController] SMTP ready");
  }
});

// --------------------
// JWT token generator
// --------------------
const signToken = (adminId, role = "admin") => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing in .env");
  return jwt.sign({ id: adminId, role }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// --------------------
// Login
// --------------------
export const login = async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = normalizeEmail(rawEmail);

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email & password required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = signToken(admin._id, admin.role || "admin");

    // Consistent shape with `data` object for frontend compatibility
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        email: admin.email,
        role: admin.role || "admin",
        name: admin.name || "",
      },
    });
  } catch (error) {
    console.error("[login] error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// --------------------
// Change Password (authenticated)
// --------------------
export const changePassword = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const { oldPassword, newPassword } = req.body;

    if (!adminId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!oldPassword || !newPassword) return res.status(400).json({ success: false, message: "Old & new password required" });

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Old password incorrect" });

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    return res.status(200).json({ success: true, message: "Password changed" });
  } catch (error) {
    console.error("[changePassword] error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// --------------------
// Send OTP
// --------------------
export const sendOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const admin = await Admin.findOne({ email });
    if (!admin) {
      // avoid email enumeration: you can return 200 and generic message, but here we return 404 so frontend can show message
      return res.status(404).json({ success: false, message: "No admin found with this email" });
    }

    const now = Date.now();
    const existing = otpStore.get(email);

    // prevent flooding: 60s cooldown
    if (existing && existing.cooldownUntil && existing.cooldownUntil > now) {
      const waitSec = Math.ceil((existing.cooldownUntil - now) / 1000);
      return res.status(429).json({ success: false, message: `Please wait ${waitSec}s before requesting another OTP` });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit string
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    const cooldownUntil = Date.now() + 60 * 1000; // 60s before new OTP allowed

    // schedule cleanup
    const timeoutId = setTimeout(() => {
      otpStore.delete(email);
    }, 5 * 60 * 1000 + 5000); // small buffer

    // store otp entry (replace previous)
    otpStore.set(email, { otp, expiresAt, cooldownUntil, timeoutId });

    // send mail
    const mailOptions = {
      from: `"Druk Health" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Druk Health — Your OTP",
      html: `<p>Your OTP code: <strong>${otp}</strong></p><p>It will expire in 5 minutes.</p>`,
    };

    try {
      await transporter.sendMail(mailOptions);
      if (DEBUG_LOG_OTPS) console.log(`[sendOtp] OTP for ${email}: ${otp}`);
    } catch (smtpErr) {
      // cleanup if sending failed
      clearTimeout(timeoutId);
      otpStore.delete(email);
      console.error("[sendOtp] SMTP error:", smtpErr);
      return res.status(500).json({ success: false, message: "Failed to deliver OTP email" });
    }

    return res.status(200).json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.error("[sendOtp] error:", err);
    return res.status(500).json({ success: false, message: "Server error sending OTP" });
  }
};

// --------------------
// Verify OTP
// --------------------
export const verifyOtp = (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = (req.body?.otp || "").toString().trim();

    if (!email || !otp) return res.status(400).json({ success: false, message: "Email & OTP required" });

    const entry = otpStore.get(email);
    if (!entry) return res.status(400).json({ success: false, message: "OTP expired or not requested" });

    if (Date.now() > entry.expiresAt) {
      // cleanup
      clearTimeout(entry.timeoutId);
      otpStore.delete(email);
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (entry.otp !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });

    // Optionally issue a short lived reset token, but for now we'll just return success
    // Remove OTP to prevent reuse
    clearTimeout(entry.timeoutId);
    otpStore.delete(email);

    return res.status(200).json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("[verifyOtp] error:", err);
    return res.status(500).json({ success: false, message: "Server error verifying OTP" });
  }
};

// --------------------
// Reset Password
// --------------------
export const resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const newPassword = (req.body?.newPassword || "").toString();

    if (!email || !newPassword) return res.status(400).json({ success: false, message: "Email & new password required" });

    const hashed = await bcrypt.hash(newPassword, 10);
    const admin = await Admin.findOneAndUpdate({ email }, { $set: { password: hashed } }, { new: true });

    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

    // remove any OTP entries
    const entry = otpStore.get(email);
    if (entry) {
      clearTimeout(entry.timeoutId);
      otpStore.delete(email);
    }

    return res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("[resetPassword] error:", err);
    return res.status(500).json({ success: false, message: "Server error resetting password" });
  }
};
