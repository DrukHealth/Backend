const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Store videos in 'videos' folder, images in 'images' folder
        let folder = 'posts/media';
        return {
            folder,
            resource_type: file.mimetype.startsWith('video') ? 'video' : 'image',
            public_id: `${Date.now()}-${file.originalname}`
        };
    }
});

const upload = multer({ storage });

module.exports = upload;
