import Admin from "../models/managementModel.js";

// @desc    Register new admin
// @route   POST /api/management/register
// @access  Public
export const registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin exists
    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists with this email"
      });
    }

    // Create admin
    const admin = await Admin.create({
      email,
      password
    });

    if (admin) {
      res.status(201).json({
        success: true,
        message: "Admin registered successfully",
        data: {
          _id: admin._id,
          email: admin.email,
          createdAt: admin.createdAt
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid admin data"
      });
    }
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Get all admins
// @route   GET /api/management
// @access  Public
export const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}).select("-password").sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: admins.length,
      data: admins
    });
  } catch (error) {
    console.error("Get admins error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Get single admin
// @route   GET /api/management/:id
// @access  Public
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
    console.error("Get admin error:", error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Update admin
// @route   PUT /api/management/:id
// @access  Public
export const updateAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    // Prepare update data
    const updateData = { email };
    
    // Only update password if provided and not empty
    if (password && password.trim() !== '') {
      updateData.password = password;
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Admin updated successfully",
      data: updatedAdmin
    });
  } catch (error) {
    console.error("Update admin error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Delete admin
// @route   DELETE /api/management/:id
// @access  Public
export const deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    await Admin.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Admin deleted successfully"
    });
  } catch (error) {
    console.error("Delete admin error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Keep login function but remove token
// export const loginAdmin = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const admin = await Admin.findOne({ email });
//     if (admin && (await admin.comparePassword(password))) {
//       res.json({
//         success: true,
//         message: "Login successful",
//         data: {
//           _id: admin._id,
//           email: admin.email,
//         }
//       });
//     } else {
//       res.status(401).json({
//         success: false,
//         message: "Invalid email or password"
//       });
//     }
//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt received:', { 
      email: email, 
      password: password ? '***' : 'missing' 
    });

    // Check if email and password are provided
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password"
      });
    }

    // Find admin by email (case insensitive)
    const admin = await Admin.findOne({ 
      email: email.toLowerCase().trim() 
    });
    
    console.log('👤 Admin found:', admin ? 'Yes' : 'No');
    
    if (!admin) {
      console.log('❌ No admin found with email:', email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    console.log('📧 Admin email:', admin.email);
    console.log('🔑 Stored password hash exists:', !!admin.password);
    console.log('   Is password hashed?', admin.isPasswordHashed());
    console.log('   Hash length:', admin.password?.length);

    // Check if password is hashed (should start with $2b$)
    if (!admin.isPasswordHashed()) {
      console.log('⚠️  Password is not hashed properly!');
    }

    // Compare passwords - FIXED: await properly
    console.log('🔄 Comparing passwords...');
    const isPasswordValid = await admin.comparePassword(password);
    console.log('✅ Password validation result:', isPasswordValid);

    if (isPasswordValid) {
      console.log('🎉 Login successful for:', admin.email);
      return res.json({
        success: true,
        message: "Login successful",
        data: {
          _id: admin._id,
          email: admin.email,
          createdAt: admin.createdAt
        }
      });
    } else {
      // console.log('❌ Password comparison failed');
      // console.log('   Input password:', password);
      // console.log('   Stored hash:', admin.password);
      
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

  } catch (error) {
    console.error("🔥 Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};