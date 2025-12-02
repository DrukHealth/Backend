// src/config/cloudinary.js
import dotenv from "dotenv";
dotenv.config();

import cloudinary from "cloudinary";                // default import (package)
import pkg from "multer-storage-cloudinary";       // CommonJS pkg
const CloudinaryStorage = pkg.CloudinaryStorage ? pkg.CloudinaryStorage : pkg;

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,   // pass the package object (has .v2)
  params: {
    folder: "drukhealth_ctg_uploads",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

export { cloudinary, storage };
