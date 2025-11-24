const express = require('express');
const multer = require('multer');
const {
  getAllEmails,
  getEmailById,
  createEmail,
  updateEmail,
  deleteEmail,
  sendTestEmail,
} = require('../controllers/emailController');
const {
  getAllEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} = require('../controllers/emailTemplateController');
const { authenticateToken, authenticateRoles } = require('../middleware/authentication');
const upload = require('../middleware/upload');

const router = express.Router();

// All email routes require authentication and admin role
router.use(authenticateToken);
router.use(authenticateRoles(['admin']));

// Email sender management routes
router.get('/emails', getAllEmails);
router.get('/emails/:id', getEmailById);
router.post('/emails', createEmail);
router.put('/emails/:id', updateEmail);
router.delete('/emails/:id', deleteEmail);

// Multer error handler wrapper
const handleMulterUpload = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
          const MAX_FILE_SIZE_MB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(2);
          
          // Log file size information
          console.error('❌ Multer Error - File too large:', {
            errorCode: err.code,
            errorMessage: err.message,
            maxFileSize: `${MAX_FILE_SIZE_MB} MB (${MAX_FILE_SIZE} bytes)`,
            field: err.field,
          });

          // Try to get file size from request if available
          if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
              const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
              console.error(`  File ${index + 1}: ${file.originalname} - ${fileSizeMB} MB (${file.size} bytes)`);
            });
          }

          // Check if there's content-length header
          if (req.headers['content-length']) {
            const contentLength = parseInt(req.headers['content-length']);
            const contentLengthMB = (contentLength / (1024 * 1024)).toFixed(2);
            console.error(`  Total request size: ${contentLengthMB} MB (${contentLength} bytes)`);
          }

          return res.status(400).json({
            error: `File too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB (${MAX_FILE_SIZE} bytes)`,
            maxFileSize: MAX_FILE_SIZE,
            maxFileSizeMB: MAX_FILE_SIZE_MB,
          });
        }
        
        // Other multer errors
        console.error('❌ Upload Error:', {
          message: err.message,
          stack: err.stack,
        });
        return res.status(400).json({ error: err.message });
      }
      
      // Log file sizes when upload succeeds
      if (req.files && req.files.length > 0) {
        console.log('📎 Files uploaded successfully:');
        req.files.forEach((file, index) => {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
          console.log(`  File ${index + 1}: ${file.originalname} - ${fileSizeMB} MB (${file.size} bytes)`);
        });
      }
      
      next();
    });
  };
};

// Test email route with file upload support
router.post('/emails/test', handleMulterUpload(upload.array('attachments', 10)), sendTestEmail);

// Email template management routes
router.get('/email-templates', getAllEmailTemplates);
router.get('/email-templates/:id', getEmailTemplateById);
router.post('/email-templates', createEmailTemplate);
router.put('/email-templates/:id', updateEmailTemplate);
router.delete('/email-templates/:id', deleteEmailTemplate);

module.exports = router;

