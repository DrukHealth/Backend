import jwt from "jsonwebtoken";
import User from "../models/User.js";
// import Admin from "../models/managementModel.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      ok: false,
      message: "Missing token in Authorization header (expected 'Bearer <token>')",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role }
    next();
  } catch (err) {
    console.error("❌ Invalid token:", err.message);
    return res.status(401).json({ ok: false, message: "Invalid or expired token" });
  }
}
