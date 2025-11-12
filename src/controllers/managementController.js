import Admin from "../models/managementModel.js";
import bcrypt from "bcryptjs";

export const registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    const existingAdmin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: "Admin already exists" 
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new Admin({
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        id: admin._id,
        email: admin.email,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    console.error("Error registering admin:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during registration",
      error: error.message 
    });
  }
};

export const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find()
      .select("-password")
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: admins.length,
      data: admins
    });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching admins",
      error: error.message 
    });
  }
};

export const getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select("-password");
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: "Admin not found" 
      });
    }

    res.json({ 
      success: true, 
      data: admin 
    });
  } catch (error) {
    console.error("Error fetching admin:", error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid admin ID" 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Server error while retrieving admin",
      error: error.message 
    });
  }
};

export const updateAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const adminId = req.params.id;

    // Validate ID format
    if (!adminId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid admin ID format" 
      });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: "Admin not found" 
      });
    }

    if (email) {
      const existingAdmin = await Admin.findOne({ 
        email: email.toLowerCase().trim(),
        _id: { $ne: adminId }
      });
      
      if (existingAdmin) {
        return res.status(400).json({ 
          success: false, 
          message: "Email already exists" 
        });
      }
      
      admin.email = email.toLowerCase().trim();
    }
    
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(password, salt);
    }

    await admin.save();

    res.json({
      success: true,
      message: "Admin updated successfully",
      data: {
        id: admin._id,
        email: admin.email,
        updatedAt: admin.updatedAt
      }
    });
  } catch (error) {
    console.error("Error updating admin:", error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid admin ID" 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Server error while updating admin",
      error: error.message 
    });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;

    // Validate ID format
    if (!adminId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid admin ID format" 
      });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: "Admin not found" 
      });
    }

    await Admin.findByIdAndDelete(adminId);

    res.json({
      success: true,
      message: "Admin deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting admin:", error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid admin ID" 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Server error while deleting admin",
      error: error.message 
    });
  }
};