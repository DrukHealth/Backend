import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
import pkg from "multer-storage-cloudinary";
const { CloudinaryStorage } = pkg;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "drukhealth_ctg_uploads",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

export { cloudinary, storage };
