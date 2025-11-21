const express = require('express');
const {
  getAllContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} = require('../controllers/contactController');
const { authenticateToken, authenticateRoles } = require('../middleware/authentication');

const router = express.Router();

// All contact routes require authentication and admin role
router.use(authenticateToken);
router.use(authenticateRoles(['admin']));

// Contact management routes
router.get('/contacts', getAllContacts);
router.get('/contacts/:id', getContactById);
router.post('/contacts', createContact);
router.put('/contacts/:id', updateContact);
router.delete('/contacts/:id', deleteContact);

module.exports = router;

