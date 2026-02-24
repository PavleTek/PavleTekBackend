const express = require('express');
const {
  getAllDocuments,
  createDocument,
  downloadFile,
  deleteDocument
} = require('../controllers/strideDocController');
const { authenticateToken, authenticateRoles } = require('../middleware/authentication');
const documentUpload = require('../middleware/documentUpload');

const router = express.Router();

// All StrideDoc routes require authentication and admin role
router.use(authenticateToken);
router.use(authenticateRoles(['admin']));

// Document management routes
router.get('/stride-docs', getAllDocuments);
router.post(
  '/stride-docs',
  (req, res, next) => {
    const upload = documentUpload.fields([
      { name: 'mdFile', maxCount: 1 },
      { name: 'pdfFile', maxCount: 1 }
    ]);

    upload(req, res, (err) => {
      if (err) {
        console.error('Multer upload error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          // Log the content-length header if available to see how big the request was
          const size = req.headers['content-length'];
          console.error(`File too large. Request size: ${size ? (size / 1024 / 1024).toFixed(2) + 'MB' : 'unknown'}`);
          return res.status(400).json({ 
            error: `File too large. Maximum size allowed is 100MB. Your request was approximately ${size ? (size / 1024 / 1024).toFixed(2) + 'MB' : 'unknown'}.` 
          });
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  createDocument
);
router.get('/stride-docs/:id/:type', downloadFile);
router.delete('/stride-docs/:id', deleteDocument);

module.exports = router;
