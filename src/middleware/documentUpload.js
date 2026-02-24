const multer = require("multer");
const path = require("path");

// Configure allowed file types for StrideDoc
const allowedMimeTypes = [
  "application/pdf",        // PDF
  "text/markdown",          // Markdown
  "text/plain",             // Plain text (often used for .md)
  "text/x-markdown",        // Another markdown variant
];

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Check if file mimetype is allowed
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Check file extension as fallback
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [".pdf", ".md", ".markdown"];
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF and Markdown files are allowed for StrideDoc."
        ),
        false
      );
    }
  }
};

// Configure multer instance
const documentUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // Increased to 100MB limit per file
    files: 2, // Maximum 2 files (md and pdf)
  },
});

module.exports = documentUpload;
