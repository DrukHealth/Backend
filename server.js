require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const scanRoutes = require("./src/routes/scanRoutes");

const app = express();
const server = http.createServer(app); // Create HTTP server
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// ✅ Attach io to the app (so req.app.get("io") works)
app.set("io", io);

app.use(cors());
app.use(express.json());
app.use("/api", scanRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Socket.IO connection logs
io.on("connection", (socket) => {
  console.log("🟢 A client connected:", socket.id);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
