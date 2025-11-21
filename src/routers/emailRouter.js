const express = require('express');
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

// Test email route with file upload support
router.post('/emails/test', upload.array('attachments', 10), sendTestEmail);

// Email template management routes
router.get('/email-templates', getAllEmailTemplates);
router.get('/email-templates/:id', getEmailTemplateById);
router.post('/email-templates', createEmailTemplate);
router.put('/email-templates/:id', updateEmailTemplate);
router.delete('/email-templates/:id', deleteEmailTemplate);

module.exports = router;

