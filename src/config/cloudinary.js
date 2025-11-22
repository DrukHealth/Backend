import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// For ESM and the latest multer-storage-cloudinary, you must use default import:
import multerStorageCloudinary from "multer-storage-cloudinary";
const CloudStorage = multerStorageCloudinary.CloudinaryStorage || multerStorageCloudinary.default;

// Then create storage
const storage = new CloudStorage({
  cloudinary,
  params: {
    folder: "drukhealth_ctg_uploads",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

export { cloudinary, storage };
