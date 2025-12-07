// import dotenv from "dotenv";
// dotenv.config();
// import express from "express";
// import mongoose from "mongoose";
// import cors from "cors";
// import http from "http";
// import { Server } from "socket.io";
// import scanRoutes from "./src/routes/scanRoutes.js";
// import authRoutes from "./src/routes/authRoutes.js";
// import managementRoutes from "./src/routes/managementRoutes.js";

// const app = express();
// const server = http.createServer(app);

// const allowedOrigins = [
//   "http://localhost:5173",
//   "http://127.0.0.1:5173",
//   "https://drukhealthfrontend.vercel.app"
// ];

// const io = new Server(server, {
//   cors: {
//     origin: allowedOrigins,
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     credentials: true,
//   },
// });

// app.use(cors({
//   origin: allowedOrigins,
//   credentials: true,
// }));

// app.set("io", io);

// // ❌ REMOVE THIS LINE
// // app.use(cors());

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Routes
// app.use("/api", scanRoutes);
// app.use("/auth", authRoutes);
// app.use("/api/manage", managementRoutes);

// // MongoDB
// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => console.log("✅ MongoDB connected"))
//   .catch((err) => console.error("❌ MongoDB connection error:", err));

// io.on("connection", (socket) => {
//   console.log("🟢 A client connected:", socket.id);
//   socket.on("disconnect", () => console.log("🔴 Client disconnected:", socket.id));
// });

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


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

const app = express();
const server = http.createServer(app);

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://drukhealthfrontend.vercel.app"
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// ROUTES (VERY IMPORTANT ORDER)
app.use("/api", scanRoutes);
app.use("/auth", authRoutes);               // <-- your forgot-password route lives here
app.use("/api/manage", managementRoutes);

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("DrukHealth Backend is running...");
});

// MONGO DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ DB error:", err));

// START SERVER
const PORT = process.env.PORT || 9000;
server.listen(PORT, () =>
  console.log(`🚀 Backend running at http://localhost:${PORT}`)
);
