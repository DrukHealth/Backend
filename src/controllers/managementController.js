import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ----------------------
// REGISTER ADMIN
// ----------------------
export const registerAdmin = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || "admin"
    });

    await user.save();

    res.status(201).json({ 
      success: true, 
      message: "Admin registered successfully", 
      data: { id: user._id, email: user.email, role: user.role } 
    });
  } catch (error) {
    console.error("Error registering admin:", error);
    res.status(500).json({ success: false, message: "Server error during registration", error: error.message });
  }
};

// ----------------------
// LOGIN ADMIN
// ----------------------
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "supersecretkey",
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, data: { id: user._id, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Error logging in admin:", error);
    res.status(500).json({ success: false, message: "Server error during login", error: error.message });
  }
};

// ----------------------
// GET ALL ADMINS (superadmin only)
// ----------------------
export const getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: { $in: ["admin", "superadmin"] } })
                             .select("-password")
                             .sort({ createdAt: -1 });
    res.json({ success: true, count: admins.length, data: admins });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ success: false, message: "Server error while fetching admins", error: error.message });
  }
};

// ----------------------
// UPDATE ADMIN
// ----------------------
export const updateAdmin = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const adminId = req.params.id;

    const user = await User.findById(adminId);
    if (!user) return res.status(404).json({ success: false, message: "Admin not found" });

    if (email) {
      const existingUser = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: adminId } });
      if (existingUser) return res.status(400).json({ success: false, message: "Email already exists" });
      user.email = email.toLowerCase().trim();
    }

    if (password && password.trim() !== "") {
      user.password = await bcrypt.hash(password, 10);
    }

    if (role) user.role = role;

    await user.save();
    res.json({ success: true, message: "Admin updated successfully", data: { id: user._id, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Error updating admin:", error);
    res.status(500).json({ success: false, message: "Server error while updating admin", error: error.message });
  }
};

// ----------------------
// DELETE ADMIN
// ----------------------
export const deleteAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;
    const user = await User.findById(adminId);
    if (!user) return res.status(404).json({ success: false, message: "Admin not found" });

    await User.findByIdAndDelete(adminId);
    res.json({ success: true, message: "Admin deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).json({ success: false, message: "Server error while deleting admin", error: error.message });
  }
};
