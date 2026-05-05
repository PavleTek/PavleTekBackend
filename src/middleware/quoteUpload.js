const multer = require('multer');
const path = require('path');

// Matches the allowed MIME types from the landing page quoteSchema.ts
const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error('Invalid file type. Allowed: PDF, DOC, DOCX, PNG, JPEG.'),
        false
      );
    }
  }
};

const quoteUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file (matches MAX_ATTACHMENT_BYTES)
    files: 5, // max 5 files (matches MAX_ATTACHMENTS)
  },
});

module.exports = quoteUpload;
