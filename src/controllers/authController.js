import jwt from "jsonwebtoken";
import User from "../models/User.js";

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ ok: false, message: "Email & password required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ ok: false, message: "Invalid credentials" });

  const ok = await user.comparePassword(password);
  if (!ok) return res.status(401).json({ ok: false, message: "Invalid credentials" });

  const token = signToken(user);
  res.json({ ok: true, token, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ ok: false, message: "currentPassword & newPassword required" });
  }
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ ok: false, message: "User not found" });

  const ok = await user.comparePassword(currentPassword);
  if (!ok) return res.status(401).json({ ok: false, message: "Current password incorrect" });

  await user.setPassword(newPassword);
  await user.save();
  return res.json({ ok: true, message: "Password updated" });
}
