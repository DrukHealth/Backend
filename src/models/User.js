import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: "" },
    role: { type: String, enum: ["SUPER_ADMIN", "ADMIN"], default: "ADMIN", index: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (pwd) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(pwd, salt);
};

userSchema.methods.comparePassword = function (pwd) {
  return bcrypt.compare(pwd, this.passwordHash);
};

export default mongoose.model("User", userSchema);
