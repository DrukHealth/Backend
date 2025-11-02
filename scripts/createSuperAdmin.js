import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from "../models/User.js";

// Fix: Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

async function createSuperAdmin() {
  try {
    // Debug: Check if MONGO_URI_1 is loaded
    if (!process.env.MONGO_URI_1) {
      console.error("❌ MONGO_URI_1 not found in .env file!");
      console.log("Current directory:", __dirname);
      process.exit(1);
    }

    console.log("✅ Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI_1);
    console.log("✅ Connected to MongoDB");

    // Check if super admin exists
    const existing = await User.findOne({ email: "chimikawang295@gmail.com" });

    if (existing) {
      console.log("⚠️ Super admin already exists!");
      console.log("📧 Email: chimikawang295@gmail.com");
      await mongoose.connection.close();
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("Admin@123", salt);

    // Create super admin
    const superAdmin = new User({
      email: "chimikawang295@gmail.com",
      password: hashedPassword,
      role: "superadmin"
    });

    await superAdmin.save();

    console.log("✅ Super admin created successfully!");
    console.log("📧 Email: chimikawang295@gmail.com");
    console.log("🔑 Initial Password: Admin@123");
    console.log("⚠️ Change this password after first login!");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
  }
}

createSuperAdmin();