const express = require('express');
const quoteUpload = require('../middleware/quoteUpload');
const { createQuoteInquiry, createMeetingRequest } = require('../controllers/publicQuoteController');

const router = express.Router();

// Handle multer errors gracefully
function handleMulterError(err, req, res, next) {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum 10 MB per file.' });
  }
  if (err && err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Too many files. Maximum 5 attachments.' });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'File upload error.' });
  }
  next();
}

router.post(
  '/quote-inquiries',
  (req, res, next) => {
    quoteUpload.array('attachments', 5)(req, res, (err) => {
      handleMulterError(err, req, res, next);
    });
  },
  createQuoteInquiry
);

router.post('/meeting-requests', createMeetingRequest);

module.exports = router;
