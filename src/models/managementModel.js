import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// 🧩 Define schema
const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
  },
  { timestamps: true }
);

// 🔒 Hash password before save (only if modified)
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔄 Compare password method
adminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ⚙️ Helper: Check if password already hashed
adminSchema.methods.isPasswordHashed = function () {
  return this.password?.startsWith("$2b$") || false;
};

// ✅ Export default (important!)
export default mongoose.model("Admin", adminSchema);
