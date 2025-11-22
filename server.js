import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import bcrypt from "bcryptjs";

import scanRoutes from "./src/routes/scanRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import managementRoutes from "./src/routes/managementRoutes.js";
import User from "./src/models/User.js"; // this is now pointing to admins collection

const app = express();
const server = http.createServer(app);

// -------------------
// Socket.IO setup
// -------------------
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://drukhealthfrontend.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});
app.set("io", io);

// -------------------
// Middleware
// -------------------
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://drukhealthfrontend.vercel.app"
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------
// Routes
// -------------------
app.use("/api", scanRoutes);
app.use("/auth", authRoutes);
app.use("/api/manage", managementRoutes);

// -------------------
// MongoDB connection & default superadmin in admins collection
// -------------------
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");

    const email = process.env.SMTP_USER; // Gmail for OTP
    const password = process.env.SMTP_PASS;

    if (!email || !password) {
      console.log("⚠️ Gmail superadmin credentials not set in .env");
      return;
    }

    // Check if Gmail superadmin already exists in admins collection
    const existingSuperAdmin = await User.findOne({ email: email.toLowerCase().trim() });
    if (!existingSuperAdmin) {
      const hashedPassword = await bcrypt.hash(password, 10);

      await User.create({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: "superadmin",
        name: "Chimi Kawang" // optional
      });

      console.log("✅ Gmail superadmin created in admins collection:", email);
    } else {
      console.log("ℹ️ Gmail superadmin already exists in admins collection:", email);
    }
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));

// -------------------
// Socket.IO events
// -------------------
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);
  socket.on("disconnect", () => console.log("🔴 Client disconnected:", socket.id));
});

// -------------------
// Start server
// -------------------
const PORT = process.env.PORT || 1000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
