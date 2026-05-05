const express = require('express');
const { authenticateToken, authenticateRoles } = require('../middleware/authentication');
const {
  listMeetingRequests,
  getMeetingRequest,
  updateMeetingRequest,
  deleteMeetingRequest,
} = require('../controllers/meetingRequestController');

const router = express.Router();

router.use(authenticateToken);
router.use(authenticateRoles(['admin']));

router.get('/meeting-requests', listMeetingRequests);
router.get('/meeting-requests/:id', getMeetingRequest);
router.patch('/meeting-requests/:id', updateMeetingRequest);
router.delete('/meeting-requests/:id', deleteMeetingRequest);

module.exports = router;
