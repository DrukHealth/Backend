// src/config/cloudinary.js
import dotenv from "dotenv";
dotenv.config();

import cloudinary from "cloudinary";
import pkg from "multer-storage-cloudinary";

const { CloudinaryStorage } = pkg;

// Configure cloudinary using v2
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MUST pass full cloudinary object (not v2)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "drukhealth_ctg_uploads",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

export { cloudinary, storage };
