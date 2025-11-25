import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ["admin", "super_admin"],
    default: "admin",
    required: true
  }
}, { 
  timestamps: true 
});

// Remove the _id field from JSON output and use id instead
adminSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;