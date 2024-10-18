const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads/logo"; // Directory where files will be saved
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

const uploadLogo = multer({ storage });

module.exports = uploadLogo;
