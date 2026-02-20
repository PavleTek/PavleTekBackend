const express = require('express');
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  markInvoiceAsSent,
  getLatestInvoiceNumber,
  uploadDocuments,
  getDocument,
  deleteDocuments,
  sendInvoiceEmail,
  scheduleSend,
  cancelSchedule,
} = require('../controllers/invoiceController');
const { authenticateToken, authenticateRoles } = require('../middleware/authentication');
const upload = require('../middleware/upload');

const router = express.Router();

// All invoice routes require authentication and admin role
router.use(authenticateToken);
router.use(authenticateRoles(['admin']));

// Invoice management routes
router.get('/invoices', getAllInvoices);
router.get('/invoices/latest-number/:toCompanyId', getLatestInvoiceNumber);
router.get('/invoices/:id', getInvoiceById);
router.post('/invoices', createInvoice);
router.put('/invoices/:id', updateInvoice);
router.delete('/invoices/:id', deleteInvoice);
router.patch('/invoices/:id/sent', markInvoiceAsSent);

// R2 document routes (must be after /invoices/:id)
router.post(
  '/invoices/:id/documents',
  upload.fields([{ name: 'invoicePdf', maxCount: 1 }, { name: 'asPdf', maxCount: 1 }]),
  uploadDocuments
);
router.get('/invoices/:id/documents/:type', getDocument);
router.delete('/invoices/:id/documents', deleteDocuments);
router.post('/invoices/:id/send-email', sendInvoiceEmail);
router.post('/invoices/:id/schedule-send', scheduleSend);
router.patch('/invoices/:id/cancel-schedule', cancelSchedule);

module.exports = router;

