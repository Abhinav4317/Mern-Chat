// middlewares/multer.middleware.js
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "chat_uploads",
    format: async (req, file) => "png", // supports promises as well
    public_id: (req, file) => Date.now(),
  },
});

const upload = multer({ storage: storage });

module.exports = upload;
