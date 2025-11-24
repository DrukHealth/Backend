import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import Admin from "../models/managementModel.js";

// --------------------
// Temporary OTP storage
// --------------------
const otpStore = new Map();

// --------------------
// Nodemailer Transport
// --------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// --------------------
// JWT token generator
// --------------------
const signToken = (adminId, role = "ADMIN") => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing in .env");
  return jwt.sign({ id: adminId, role }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// --------------------
// Password comparison helper
// --------------------
Admin.prototype.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// --------------------
// Middleware: verify token
// --------------------
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// --------------------
// Login
// --------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email & password required" });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const token = signToken(admin._id, admin.role || "ADMIN");

    res.status(200).json({
      success: true,
      message: "Login successful ✅",
      token,
      role: admin.role || "ADMIN",
      email: admin.email,
      name: admin.name || "",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// --------------------
// Change Password
// --------------------
export const changePassword = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const { oldPassword, newPassword } = req.body;
    if (!adminId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

    const isMatch = await admin.comparePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: "Old password incorrect" });

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.status(200).json({ success: true, message: "Password changed ✅" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// --------------------
// Send OTP
// --------------------
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ success: false, message: "No admin found with this email" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore.set(email, otp);

    await transporter.sendMail({
      from: `"Druk Health" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your OTP for Druk Health",
      html: `<p>Your OTP is: <b>${otp}</b></p><p>It expires in 5 minutes.</p>`,
    });

    console.log(`🔐 OTP sent to ${email}: ${otp}`);
    res.status(200).json({ success: true, message: "OTP sent to email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error sending OTP" });
  }
};

// --------------------
// Verify OTP
// --------------------
export const verifyOtp = (req, res) => {
  try {
    const { email, otp } = req.body;
    const correctOtp = otpStore.get(email);

    if (!correctOtp) return res.status(400).json({ success: false, message: "OTP expired or not requested" });
    if (parseInt(otp) !== correctOtp) return res.status(400).json({ success: false, message: "Invalid OTP" });

    res.status(200).json({ success: true, message: "OTP verified ✅" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error verifying OTP" });
  }
};

// --------------------
// Reset Password
// --------------------
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ success: false, message: "Email & new password required" });

    const hashed = await bcrypt.hash(newPassword, 10);
    const admin = await Admin.findOneAndUpdate({ email }, { password: hashed }, { new: true });
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

    otpStore.delete(email);
    res.status(200).json({ success: true, message: "Password reset successfully 🎉" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error resetting password" });
  }
};
