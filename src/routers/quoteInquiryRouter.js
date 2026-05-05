const express = require('express');
const { authenticateToken, authenticateRoles } = require('../middleware/authentication');
const {
  listQuoteInquiries,
  getQuoteInquiry,
  updateQuoteInquiry,
  deleteQuoteInquiry,
  downloadAttachment,
} = require('../controllers/quoteInquiryController');

const router = express.Router();

router.use(authenticateToken);
router.use(authenticateRoles(['admin']));

router.get('/quote-inquiries', listQuoteInquiries);
router.get('/quote-inquiries/:id', getQuoteInquiry);
router.patch('/quote-inquiries/:id', updateQuoteInquiry);
router.delete('/quote-inquiries/:id', deleteQuoteInquiry);
router.get('/quote-inquiries/:id/attachments/:attId/download', downloadAttachment);

module.exports = router;
