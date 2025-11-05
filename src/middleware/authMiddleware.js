import jwt from "jsonwebtoken";
import Admin from "../models/managementModel.js";
import User from "../models/User.js"; // ✅ import super admin model

const JWT_SECRET = process.env.JWT_SECRET || "mySuperSecretKey";

export const protect = async (req, res, next) => {
  try {
    let token;

    // ✅ Extract Bearer token
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized — token missing",
      });
    }

    // ✅ Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // ✅ Try to find in both collections
    let admin = await Admin.findById(decoded.id).select("-password");
    if (!admin) {
      const superAdmin = await User.findById(decoded.id).select("-password");
      if (!superAdmin) {
        return res.status(401).json({
          success: false,
          message: "Admin not found — token invalid",
        });
      }
      req.admin = superAdmin;
    } else {
      req.admin = admin;
    }

    next();
  } catch (error) {
    console.error("❌ Auth error:", error);
    res.status(401).json({
      success: false,
      message: "Not authorized — invalid or expired token",
      error: error.message,
    });
  }
};
