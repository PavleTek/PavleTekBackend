const express = require('express');
const {
  getAllDocuments,
  createDocument,
  downloadFile,
  deleteDocument,
  generatePdf
} = require('../controllers/strideDocController');
const { authenticateToken, authenticateRoles } = require('../middleware/authentication');
const documentUpload = require('../middleware/documentUpload');

const router = express.Router();

// All StrideDoc routes require authentication and admin role
router.use(authenticateToken);
router.use(authenticateRoles(['admin']));

// Document management routes
router.get('/stride-docs', getAllDocuments);
router.post('/stride-docs', createDocument);
router.get('/stride-docs/:id/:type', downloadFile);
router.post('/stride-docs/generate-pdf', generatePdf);
router.delete('/stride-docs/:id', deleteDocument);

module.exports = router;
