//middelware (multer)

const multer = require('multer')

const { CloudinaryStorage } = require('multer-storage-cloudinary')
const cloudinary = require('../src/cloudinaryConfig')

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'MiaurKet',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

const upload = multer({ storage });

module.exports = upload;