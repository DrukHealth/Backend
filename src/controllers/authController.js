import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * 🧠 Helper: Generate signed JWT token
 */
const signToken = (userId, role = "SUPER_ADMIN") => {
  if (!process.env.JWT_SECRET) {
    console.error("❌ JWT_SECRET missing in environment variables!");
    throw new Error("Server configuration error: JWT secret not set.");
  }
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

/**
 * 🟢 Login Controller — Super Admin
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔍 Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // 🔎 Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // 🔑 Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // 🪪 Generate JWT
    const token = signToken(user._id, user.role || "SUPER_ADMIN");

    res.status(200).json({
      success: true, // ✅ same structure as management login
      message: "Login successful ✅",
      token,
      role: user.role || "SUPER_ADMIN",
      email: user.email,
      name: user.name || "",
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login.",
      error: error.message,
    });
  }
};

/**
 * 🟠 Change Password Controller
 */
export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { oldPassword, newPassword } = req.body;

    // Validate request
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: user not authenticated." });
    }

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Old and new passwords are required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Old password is incorrect." });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully ✅",
    });
  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while changing password.",
      error: error.message,
    });
  }
};
