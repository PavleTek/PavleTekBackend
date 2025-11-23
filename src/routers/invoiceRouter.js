const express = require('express');
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  markInvoiceAsSent,
  getLatestInvoiceNumber,
} = require('../controllers/invoiceController');
const { authenticateToken, authenticateRoles } = require('../middleware/authentication');

const router = express.Router();

// All invoice routes require authentication and admin role
router.use(authenticateToken);
router.use(authenticateRoles(['admin']));

// Invoice management routes
router.get('/invoices', getAllInvoices);
router.get('/invoices/:id', getInvoiceById);
router.post('/invoices', createInvoice);
router.put('/invoices/:id', updateInvoice);
router.delete('/invoices/:id', deleteInvoice);
router.patch('/invoices/:id/sent', markInvoiceAsSent);

// Invoice number lookup
router.get('/invoices/latest-number/:toCompanyId', getLatestInvoiceNumber);

module.exports = router;

