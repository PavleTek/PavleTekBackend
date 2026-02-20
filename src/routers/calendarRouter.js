const express = require('express');
const {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getColorConfig,
  updateColorConfig,
} = require('../controllers/calendarController');
const { authenticateToken, authenticateRoles } = require('../middleware/authentication');

const router = express.Router();

router.use(authenticateToken);
router.use(authenticateRoles(['admin']));

router.get('/calendar/events', getAllEvents);
router.get('/calendar/events/:id', getEventById);
router.post('/calendar/events', createEvent);
router.put('/calendar/events/:id', updateEvent);
router.delete('/calendar/events/:id', deleteEvent);
router.get('/calendar/color-config', getColorConfig);
router.put('/calendar/color-config', updateColorConfig);

module.exports = router;
