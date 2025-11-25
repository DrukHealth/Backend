// controllers/authController.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import Admin from "../models/managementModel.js";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

const DEBUG_LOG_OTPS = process.env.DEBUG_LOG_OTPS === "true";

// =========================================
//  HELPER → Normalize email
// =========================================
function normalizeEmail(raw) {
  return (raw || "").toString().trim().toLowerCase();
}

// =========================================
//  OAuth2 Gmail Client
// =========================================
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"  // redirect URI
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

// =========================================
//  Send Email (OAuth2 Gmail)
// =========================================
async function sendEmailOAuth(to, subject, html) {
  try {
    const tokenObject = await oAuth2Client.getAccessToken();
    const accessToken = tokenObject?.token;

    if (!accessToken) {
      throw new Error("Failed to generate OAuth2 access token");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken,
      },
    });

    await transporter.sendMail({
      from: `"Druk Health" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("📩 Email sent to", to);
  } catch (err) {
    console.error("[Email Error]", err);
    throw new Error("Email sending failed");
  }
}

// =========================================
//  JWT Token Generator
// =========================================
const signToken = (adminId, role = "admin") => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
  return jwt.sign({ id: adminId, role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

// =========================================
//  OTP Store
// =========================================
const otpStore = new Map();

// =========================================
//  LOGIN
// =========================================
export const login = async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = normalizeEmail(rawEmail);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email & password required",
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });

    const token = signToken(admin._id, admin.role || "admin");

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

// =========================================
//  CHANGE PASSWORD
// =========================================
export const changePassword = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const { oldPassword, newPassword } = req.body;

    if (!adminId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!oldPassword || !newPassword)
      return res
        .status(400)
        .json({ success: false, message: "Old & new password required" });

    const admin = await Admin.findById(adminId);
    if (!admin)
      return res.status(404).json({ success: false, message: "Admin not found" });

    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Old password incorrect" });

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("[changePassword] error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================
//  SEND OTP
// =========================================
export const sendOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email)
      return res.status(400).json({
        success: false,
        message: "Email required",
      });

    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(404).json({
        success: false,
        message: "No admin found with this email",
      });

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
    const cooldownUntil = now + 60 * 1000;

    otpStore.set(email, {
      otp,
      expiresAt,
      cooldownUntil,
      timeout: setTimeout(() => otpStore.delete(email), 5 * 60 * 1000),
    });

    await sendEmailOAuth(
      email,
      "Your OTP Code — Druk Health",
      `<p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p>`
    );

    if (DEBUG_LOG_OTPS) console.log("OTP:", email, otp);

    return res.status(200).json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("[sendOtp] error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

// =========================================
//  VERIFY OTP
// =========================================
export const verifyOtp = (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = req.body?.otp?.trim();

    const entry = otpStore.get(email);
    if (!entry)
      return res.status(400).json({
        success: false,
        message: "OTP expired or not requested",
      });

    if (Date.now() > entry.expiresAt) {
      clearTimeout(entry.timeout);
      otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (entry.otp !== otp)
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });

    clearTimeout(entry.timeout);
    otpStore.delete(email);

    return res.status(200).json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("[verifyOtp] error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================================
//  RESET PASSWORD
// =========================================
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
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });

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
