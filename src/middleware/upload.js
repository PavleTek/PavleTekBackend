const multer = require("multer");
const path = require("path");

// Configure allowed file types
const allowedMimeTypes = [
  "application/pdf", // PDF
  "text/csv", // CSV
  "application/vnd.ms-excel", // XLS
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
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
    const allowedExtensions = [".pdf", ".csv", ".xls", ".xlsx"];
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, CSV, and XLSX files are allowed."
        ),
        false
      );
    }
  }
};

// Configure multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10, // Maximum 10 files
  },
});

module.exports = upload;

