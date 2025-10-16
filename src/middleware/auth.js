import jwt from "jsonwebtoken";
import User from "../models/User.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, message: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, email }
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
}

export async function attachUser(req, _res, next) {
  if (!req.user?.id) return next();
  req.currentUser = await User.findById(req.user.id).select("-passwordHash");
  next();
}
