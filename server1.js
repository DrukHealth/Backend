// server1.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";

const app = express();

// -------------------- CORS --------------------
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());

// -------------------- DATABASE CONNECTION --------------------
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "admin_db",
});

db.getConnection()
  .then(() => console.log("✅ Connected to the database!"))
  .catch((err) => console.error("DB CONNECTION ERROR:", err));

// -------------------- EMAIL TRANSPORTER --------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Use app password if 2FA enabled
  },
  tls: { rejectUnauthorized: false }, // dev only
});

// -------------------- LOGIN --------------------
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.execute(
      "SELECT * FROM admin WHERE email = ?",
      [email]
    );

    if (rows.length === 0) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, rows[0].password_hash);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    res.json({ message: "Login successful" });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// -------------------- SEND OTP --------------------
app.post("/auth/reset-password", async (req, res) => {
  const { email } = req.body;

  try {
    const [rows] = await db.execute("SELECT * FROM admin WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiry

    await db.execute(
      "UPDATE admin SET reset_token = ?, reset_token_expiry = ? WHERE email = ?",
      [otp, expiry, email]
    );

    console.log(`OTP for ${email}: ${otp} (expires at ${expiry})`);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP is: ${otp}. It will expire in 15 minutes.`,
    });

    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// -------------------- VERIFY OTP --------------------
app.post("/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const [rows] = await db.execute(
      "SELECT * FROM admin WHERE email = ? AND reset_token = ?",
      [email, otp]
    );

    if (rows.length === 0) return res.status(400).json({ message: "Invalid OTP" });

    const tokenExpiry = new Date(rows[0].reset_token_expiry);
    if (tokenExpiry < new Date()) return res.status(400).json({ message: "OTP expired" });

    res.json({ message: "OTP verified" });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// -------------------- RESET PASSWORD CONFIRM --------------------
app.post("/auth/reset-password-confirm", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const [rows] = await db.execute(
      "SELECT * FROM admin WHERE email = ? AND reset_token = ?",
      [email, otp]
    );

    if (rows.length === 0) return res.status(400).json({ message: "Invalid OTP or email" });

    const tokenExpiry = new Date(rows[0].reset_token_expiry);
    if (tokenExpiry < new Date()) return res.status(400).json({ message: "OTP expired" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [updateResult] = await db.execute(
      "UPDATE admin SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE email = ?",
      [hashedPassword, email]
    );

    console.log(`Password updated for ${email}:`, updateResult);

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("RESET CONFIRM ERROR:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT_1 || 5001;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
