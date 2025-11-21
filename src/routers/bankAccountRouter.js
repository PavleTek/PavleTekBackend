const express = require('express');
const {
  getAllBankAccounts,
  getBankAccountById,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
} = require('../controllers/bankAccountController');
const { authenticateToken, authenticateRoles } = require('../middleware/authentication');

const router = express.Router();

// All bank account routes require authentication and admin role
router.use(authenticateToken);
router.use(authenticateRoles(['admin']));

// Bank account management routes
router.get('/bank-accounts', getAllBankAccounts);
router.get('/bank-accounts/:id', getBankAccountById);
router.post('/bank-accounts', createBankAccount);
router.put('/bank-accounts/:id', updateBankAccount);
router.delete('/bank-accounts/:id', deleteBankAccount);

module.exports = router;

