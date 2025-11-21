const express = require('express');
const {
  getAllCurrencies,
  createCurrency,
  updateCurrency,
  deleteCurrency,
} = require('../controllers/currencyController');
const {
  getAllLanguages,
  createLanguage,
  updateLanguage,
  deleteLanguage,
} = require('../controllers/languageController');
const {
  getAllCountries,
  createCountry,
  updateCountry,
  deleteCountry,
} = require('../controllers/countryController');
const { authenticateToken, authenticateRoles } = require('../middleware/authentication');

const router = express.Router();

// All mantenedores routes require authentication and admin role
router.use(authenticateToken);
router.use(authenticateRoles(['admin']));

// Currency routes
router.get('/currencies', getAllCurrencies);
router.post('/currencies', createCurrency);
router.put('/currencies/:id', updateCurrency);
router.delete('/currencies/:id', deleteCurrency);

// Language routes
router.get('/languages', getAllLanguages);
router.post('/languages', createLanguage);
router.put('/languages/:id', updateLanguage);
router.delete('/languages/:id', deleteLanguage);

// Country routes
router.get('/countries', getAllCountries);
router.post('/countries', createCountry);
router.put('/countries/:id', updateCountry);
router.delete('/countries/:id', deleteCountry);

module.exports = router;

