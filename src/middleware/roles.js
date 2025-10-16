export function onlySuperAdmin(req, res, next) {
  if (req.user?.role !== "SUPER_ADMIN") {
    return res.status(403).json({ ok: false, message: "Super admin only" });
  }
  next();
}
