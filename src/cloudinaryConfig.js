//Cloudinary
const cloudinary = require('cloudinary').v2

cloudinary.config({
    cloud_name: 'CLOUDNAME',
    api_key: 'API_KEY',
    api_secret:'API_SECRET' 
})

module.export= cloudinary