const express = require('express');
const {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} = require('../controllers/companyController');
const { authenticateToken, authenticateRoles } = require('../middleware/authentication');

const router = express.Router();

// All company routes require authentication and admin role
router.use(authenticateToken);
router.use(authenticateRoles(['admin']));

// Company management routes
router.get('/companies', getAllCompanies);
router.get('/companies/:id', getCompanyById);
router.post('/companies', createCompany);
router.put('/companies/:id', updateCompany);
router.delete('/companies/:id', deleteCompany);

module.exports = router;

