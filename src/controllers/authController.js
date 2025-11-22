import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/User.js"; // Admins collection

// ----------------------
// Temporary in-memory OTP store
// ----------------------
const otpStore = new Map(); // key = email, value = { otp, expiresAt }

// ---------------------- LOGIN ----------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required" });

    const user = await Admin.findOne({ email });
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ success: false, message: "Invalid email or password" });

    // JWT token with 30 min expiry
    const token = jwt.sign(
      { email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    res.json({ success: true, token, data: { email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------- FORGOT PASSWORD ----------------------
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const user = await Admin.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "Admin not found" });

    // Generate OTP and store in memory
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(email, { otp, expiresAt });

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Druk eHealth OTP Verification",
      text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
    });

    res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------- VERIFY OTP ----------------------
export const verifyOtp = (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ success: false, message: "Email and OTP required" });

    const record = otpStore.get(email);
    if (!record) return res.status(400).json({ success: false, message: "OTP not generated" });

    if (record.otp !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email); // remove expired OTP
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // OTP is valid, keep in memory until expiry
    res.json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------- RESET PASSWORD ----------------------
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword)
      return res.status(400).json({ success: false, message: "Email and new password required" });

    const user = await Admin.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "Admin not found" });

    user.password = bcrypt.hashSync(newPassword, 10);
    await user.save();

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------- CHANGE PASSWORD ----------------------
export const changePassword = async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;
    if (!email || !oldPassword || !newPassword)
      return res.status(400).json({ success: false, message: "All fields required" });

    const user = await Admin.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "Admin not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ success: false, message: "Old password incorrect" });

    user.password = bcrypt.hashSync(newPassword, 10);
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------- CLEANUP EXPIRED OTPs ----------------------
export const cleanupExpiredOtps = () => {
  try {
    const now = Date.now();
    for (const [email, record] of otpStore) {
      if (record.expiresAt <= now) otpStore.delete(email);
    }
  } catch (err) {
    console.error("Error cleaning expired OTPs:", err);
  }
};
