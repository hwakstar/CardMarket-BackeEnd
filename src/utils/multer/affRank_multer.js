const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads/affRank"; // Directory where files will be saved
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir); // Create the directory if it doesn't exist
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname); // Create a unique name for the file
    cb(null, uniqueName);
  },
});

const uploadAffRank = multer({ storage });

module.exports = uploadAffRank;
