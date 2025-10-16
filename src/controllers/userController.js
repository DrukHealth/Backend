import User from "../models/User.js";

export async function createAdmin(req, res) {
  const { email, name, password } = req.body;
  if (!email || !password) return res.status(400).json({ ok: false, message: "email & password required" });

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ ok: false, message: "Email already exists" });

  const user = new User({ email, name, role: "ADMIN", passwordHash: "temp" });
  await user.setPassword(password);
  await user.save();

  res.status(201).json({ ok: true, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
}

export async function me(req, res) {
  res.json({ ok: true, user: req.currentUser });
}
