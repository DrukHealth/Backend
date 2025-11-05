import jwt from "jsonwebtoken";
import Admin from "../models/managementModel.js";

const JWT_SECRET = process.env.JWT_SECRET || "mySuperSecretKey";

/* ----------------------------------------------------
 🟢 REGISTER NEW ADMIN
---------------------------------------------------- */
export const registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Admin already exists" });
    }

    const admin = await Admin.create({ email, password });

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        _id: admin._id,
        email: admin.email,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Register error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
};

/* ----------------------------------------------------
 🔐 LOGIN ADMIN
---------------------------------------------------- */
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ✅ Generate JWT token (valid for 1 day)
    const token = jwt.sign({ id: admin._id, role: "ADMIN" }, JWT_SECRET, {
      expiresIn: "1d",
    });

    // ✅ Return consistent response with success flag + token
    res.status(200).json({
      success: true,
      message: "Login successful ✅",
      token,
      role: "ADMIN",
      email: admin.email,
      name: admin.name || "",
      data: {
        _id: admin._id,
        email: admin.email,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    console.error("🔥 Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

/* ----------------------------------------------------
 📋 GET ALL ADMINS
---------------------------------------------------- */
export const getAdmins = async (_req, res) => {
  try {
    const admins = await Admin.find()
      .select("-password")
      .sort({ createdAt: -1 });
    res.json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    console.error("❌ Get admins error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching admins",
      error: error.message,
    });
  }
};

/* ----------------------------------------------------
 🔍 GET SINGLE ADMIN BY ID
---------------------------------------------------- */
export const getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select("-password");
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    res.json({ success: true, data: admin });
  } catch (error) {
    console.error("❌ Get admin error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving admin",
      error: error.message,
    });
  }
};

/* ----------------------------------------------------
 ✏️ UPDATE ADMIN
---------------------------------------------------- */
export const updateAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    if (email) admin.email = email.toLowerCase().trim();
    if (password) admin.password = password;

    await admin.save();

    res.json({
      success: true,
      message: "Admin updated successfully",
      data: {
        _id: admin._id,
        email: admin.email,
        updatedAt: admin.updatedAt,
      },
    });
  } catch (error) {
    console.error("❌ Update admin error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating admin",
      error: error.message,
    });
  }
};

/* ----------------------------------------------------
 🗑️ DELETE ADMIN
---------------------------------------------------- */
export const deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    await admin.deleteOne();

    res.json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete admin error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting admin",
      error: error.message,
    });
  }
};
