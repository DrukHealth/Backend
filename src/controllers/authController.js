// controllers/authController.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Admin from "../models/managementModel.js";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

const DEBUG_LOG_OTPS = process.env.DEBUG_LOG_OTPS === "true";

// --------------------------
// Normalize email helper
// --------------------------
function normalizeEmail(raw) {
  return (raw || "").toString().trim().toLowerCase();
}

// --------------------------
// Gmail OAuth2 Client (NO SMTP)
// --------------------------
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

// --------------------------
// Gmail API Email Sender
// --------------------------
async function sendEmail(to, subject, html) {
  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const messageParts = [
      `From: "DrukHealth" <${process.env.GMAIL_USER}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      html,
    ];

    const message = messageParts.join("\n");

    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log("📨 Gmail API Email Sent to:", to);
    return true;
  } catch (err) {
    console.error("❌ Gmail API Error:", err);
    throw new Error("Failed to send email");
  }
}

// --------------------------
// JWT Token Generator
// --------------------------
const signToken = (adminId, role = "admin") => {
  return jwt.sign({ id: adminId, role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

// --------------------------
// OTP Store
// --------------------------
const otpStore = new Map();

// --------------------------
// LOGIN
// --------------------------
export const login = async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = normalizeEmail(rawEmail);

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email & password required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = signToken(admin._id, admin.role);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        email: admin.email,
        role: admin.role,
        name: admin.name || "",
      },
    });
  } catch (err) {
    console.error("[login] error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// --------------------------
// CHANGE PASSWORD
// --------------------------
export const changePassword = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const { oldPassword, newPassword } = req.body;

    if (!adminId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

    const match = await bcrypt.compare(oldPassword, admin.password);
    if (!match) return res.status(400).json({ success: false, message: "Old password incorrect" });

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    return res.status(200).json({ success: true, message: "Password changed" });
  } catch (err) {
    console.error("[changePassword] error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// --------------------------
// SEND OTP
// --------------------------
export const sendOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email)
      return res.status(400).json({ success: false, message: "Email required" });

    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(404).json({ success: false, message: "No admin found with this email" });

    // Cooldown check
    const now = Date.now();
    const existing = otpStore.get(email);
    if (existing && existing.cooldownUntil > now) {
      const wait = Math.ceil((existing.cooldownUntil - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${wait}s before requesting another OTP`,
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 5 * 60 * 1000;

    otpStore.set(email, {
      otp,
      expiresAt,
      cooldownUntil: now + 60 * 1000,
      timeout: setTimeout(() => otpStore.delete(email), 5 * 60 * 1000),
    });

    await sendEmail(
      email,
      "Your OTP Code — Druk Health",
      `<p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p>`
    );

    if (DEBUG_LOG_OTPS) console.log("OTP:", email, otp);

    return res.status(200).json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("[sendOtp] error:", err);
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

// --------------------------
// VERIFY OTP
// --------------------------
export const verifyOtp = (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = req.body?.otp?.trim();

    const entry = otpStore.get(email);
    if (!entry) return res.status(400).json({ success: false, message: "OTP expired or not requested" });

    if (Date.now() > entry.expiresAt) {
      clearTimeout(entry.timeout);
      otpStore.delete(email);
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (entry.otp !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    clearTimeout(entry.timeout);
    otpStore.delete(email);

    return res.status(200).json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("[verifyOtp] error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// --------------------------
// RESET PASSWORD
// --------------------------
export const resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const newPassword = req.body?.newPassword;

    if (!email || !newPassword)
      return res.status(400).json({
        success: false,
        message: "Email & new password required",
      });

    const hashed = await bcrypt.hash(newPassword, 10);

    const admin = await Admin.findOneAndUpdate(
      { email },
      { password: hashed },
      { new: true }
    );

    if (!admin)
      return res.status(404).json({ success: false, message: "Admin not found" });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (err) {
    console.error("[resetPassword] error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error resetting password",
    });
  }
};
