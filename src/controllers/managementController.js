import Admin from "../models/managementModel.js";
import bcrypt from "bcryptjs";

// Improved middleware to check if user is super admin
export const requireSuperAdmin = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided."
      });
    }

    // Find admin by token (in production, you should use JWT verification)
    const admin = await Admin.findById(token);
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid token."
      });
    }

    if (admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Super admin privileges required."
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid token."
    });
  }
};

// Middleware for optional super admin check (for first-time registration)
export const allowFirstTimeRegistration = async (req, res, next) => {
  try {
    const superAdminCount = await Admin.countDocuments({ role: 'super_admin' });
    
    if (superAdminCount > 0) {
      // If super admin exists, require authentication
      return requireSuperAdmin(req, res, next);
    }
    
    // If no super admin exists, allow registration without auth
    next();
  } catch (error) {
    console.error("Error in allowFirstTimeRegistration:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const registerAdmin = async (req, res) => {
  try {
    const { email, password, role = "admin" } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    // Check if this is first-time registration (no super admin exists)
    const superAdminCount = await Admin.countDocuments({ role: 'super_admin' });
    const isFirstTimeRegistration = superAdminCount === 0;

    // For first-time registration, force role to be super_admin
    const finalRole = isFirstTimeRegistration ? 'super_admin' : role;

    // Check if super admin already exists when trying to create a new super admin
    if (finalRole === 'super_admin' && !isFirstTimeRegistration) {
      const existingSuperAdmin = await Admin.findOne({ role: 'super_admin' });
      if (existingSuperAdmin) {
        return res.status(400).json({
          success: false,
          message: "Super admin already exists. Only one super admin is allowed."
        });
      }
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
      password: hashedPassword,
      role: finalRole
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: isFirstTimeRegistration ? "Super Admin registered successfully!" : "Admin registered successfully",
      data: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
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
    const { email, password, role } = req.body;
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

    // Check if trying to change role to super_admin when one already exists
    if (role === 'super_admin' && admin.role !== 'super_admin') {
      const existingSuperAdmin = await Admin.findOne({ 
        role: 'super_admin',
        _id: { $ne: adminId }
      });
      
      if (existingSuperAdmin) {
        return res.status(400).json({
          success: false,
          message: "Super admin already exists. Cannot assign super admin role."
        });
      }
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
    
    if (role) {
      admin.role = role;
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
        role: admin.role,
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

    // Prevent deletion of the only super admin
    if (admin.role === 'super_admin') {
      const superAdminCount = await Admin.countDocuments({ role: 'super_admin' });
      if (superAdminCount === 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete the only super admin. Please create another super admin first."
        });
      }
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

// Check if super admin exists (for frontend)
export const checkSuperAdminExistence = async (req, res) => {
  try {
    const superAdminCount = await Admin.countDocuments({ role: 'super_admin' });
    
    res.json({
      success: true,
      data: {
        superAdminExists: superAdminCount > 0
      }
    });
  } catch (error) {
    console.error("Error checking super admin existence:", error);
    res.status(500).json({
      success: false,
      message: "Server error while checking super admin",
      error: error.message
    });
  }
};

// Login endpoint for admins
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Return admin data including role
    res.json({
      success: true,
      message: "Login successful",
      token: admin._id.toString(), // Using ID as token for simplicity
      data: {
        id: admin._id,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message
    });
  }
};

// Get current admin profile
export const getCurrentAdmin = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    const admin = await Admin.findById(token).select("-password");
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }

    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error("Error getting current admin:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};