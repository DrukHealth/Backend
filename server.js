// server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import scanRoutes from "./src/routes/scanRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import managementRoutes from "./src/routes/managementRoutes.js";

// -----------------------
// Initialize App & Server
// -----------------------
const app = express();
const server = http.createServer(app);

// -----------------------
// Socket.IO Setup
// -----------------------
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

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);
  socket.on("disconnect", () => console.log("🔴 Client disconnected:", socket.id));
});

// -----------------------
// Middleware
// -----------------------
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

// -----------------------
// Routes
// -----------------------
app.use("/api", scanRoutes);
app.use("/auth", authRoutes);
app.use("/api/manage", managementRoutes);

// -----------------------
// MongoDB Connection
// -----------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// -----------------------
// Start Server
// -----------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
