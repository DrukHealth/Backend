import "dotenv/config.js";
import connectDB from "../src/config/db.js";

import User from "../src/models/User.js";

await connectDB();

const email = process.env.DEFAULT_SUPERADMIN_EMAIL;
const password = process.env.DEFAULT_SUPERADMIN_PASSWORD;

if (!email || !password) {
  console.error("Please set DEFAULT_SUPERADMIN_EMAIL and DEFAULT_SUPERADMIN_PASSWORD in .env");
  process.exit(1);
}

let user = await User.findOne({ email });
if (user) {
  user.role = "SUPER_ADMIN";
  await user.save();
  console.log("✅ Super admin ensured:", email);
  process.exit(0);
}

user = new User({ email, role: "SUPER_ADMIN", name: "Super Admin", passwordHash: "temp" });
await user.setPassword(password);
await user.save();

console.log("✅ Super admin created:", email);
process.exit(0);
