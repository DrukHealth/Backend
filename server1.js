// -------------------- LOAD ENV --------------------
import dotenv from "dotenv";
dotenv.config(); // Must be at the top

// -------------------- IMPORTS --------------------
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";

import mongoose from "./config/mongo.js"; // Mongo connection
import Admin from "./models/admin_model.js";
import ResetToken from "./models/resetTokenmodel.js";

const app = express();

// -------------------- CORS --------------------
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// -------------------- EMAIL TRANSPORTER --------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false }, // dev only
});

// -------------------- DEFAULT ADMIN CREATION --------------------
async function createDefaultAdmin() {
  try {
    const defaultEmail = "chimikawang295@gmail.com";
    const existing = await Admin.findOne({ email: defaultEmail });
    if (!existing) {
      const hashedPassword = await bcrypt.hash("Admin@123", 10); // default password
      const defaultAdmin = new Admin({
        email: defaultEmail,
        password_hash: hashedPassword,
      });
      await defaultAdmin.save();
      console.log(`✅ Default admin created: ${defaultEmail} / Admin@123`);
    } else {
      console.log("✅ Default admin already exists");
    }
  } catch (err) {
    console.error("Error creating default admin:", err);
  }
}

// -------------------- LOGIN --------------------
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, admin.password_hash);
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
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await ResetToken.deleteMany({ email });
    const resetToken = new ResetToken({ email, otp, expiresAt: expiry });
    await resetToken.save();

    console.log(`OTP for ${email}: ${otp} (expires at ${expiry})`);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP is: ${otp}. It expires in 15 minutes.`,
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
    const tokenDoc = await ResetToken.findOne({ email, otp });
    if (!tokenDoc) return res.status(400).json({ message: "Invalid OTP" });

    if (tokenDoc.expiresAt < new Date()) return res.status(400).json({ message: "OTP expired" });

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
    const tokenDoc = await ResetToken.findOne({ email, otp });
    if (!tokenDoc) return res.status(400).json({ message: "Invalid OTP or email" });
    if (tokenDoc.expiresAt < new Date()) return res.status(400).json({ message: "OTP expired" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Admin.updateOne({ email }, { password_hash: hashedPassword });

    await ResetToken.deleteMany({ email });

    console.log(`Password updated for ${email}`);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("RESET CONFIRM ERROR:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT_1 || 5001;

// Wait for MongoDB connection, create default admin, then start server
mongoose.connection.once("open", async () => {
  console.log("✅ MongoDB connected");

  await createDefaultAdmin(); // create default admin if not exists

  app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
});
