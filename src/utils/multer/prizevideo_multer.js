const multer = require("multer");
const fs = require("fs");
const path = require("path");

const UPLOAD_DIR = path.join(__dirname, "../../../uploads/prizeVideo");

// Middleware to create the directory if it doesn't exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true }); // Create the directory recursively
  }
};

// Set multer storage and ensure root-level directory creation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(UPLOAD_DIR); // Creates 'uploads' at the root level
    ensureDirectoryExists(uploadDir); // Ensure directory exists
    cb(null, uploadDir); // Upload file to this directory
  },
  filename: (req, file, cb) => {
    cb(null, req.body.kind + ".mp4"); // Use a unique filename
  },
});

const uploadPrizeVideo = multer({ storage });

module.exports = uploadPrizeVideo;
