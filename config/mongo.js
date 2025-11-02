import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI_1, {
      serverSelectionTimeoutMS: 10000,
      ssl: true, // Atlas requires SSL by default
    });
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

export default connectMongo;
