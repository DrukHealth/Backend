import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectMongo from "./config/mongo.js";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();

// ✅ CORS setup: allow frontend requests from localhost:5173
app.use(cors({ origin: "http://localhost:5173" }));

// Parse JSON bodies
app.use(express.json());

// Debug check
console.log("MONGO_URI_1 =", process.env.MONGO_URI_1);
console.log("PORT_1 =", process.env.PORT_1);

// Connect to MongoDB
connectMongo();

// Routes
app.use("/auth", authRoutes);

app.get("/", (req, res) => res.send("Kawang Backend Running..."));

// Start server
const PORT = process.env.PORT_1 || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
