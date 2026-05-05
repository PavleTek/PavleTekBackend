const prisma = require('../lib/prisma');

const VALID_STATUSES = ['new', 'scheduled', 'done', 'archived'];

/**
 * GET /api/admin/meeting-requests
 * Query params: status, page, pageSize
 */
async function listMeetingRequests(req, res) {
  const { status, page = '1', pageSize = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = {};

  if (status && VALID_STATUSES.includes(status)) {
    where.status = status;
  }

  try {
    const [requests, total] = await Promise.all([
      prisma.meetingRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSizeNum,
      }),
      prisma.meetingRequest.count({ where }),
    ]);

    return res.json({
      data: requests,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    });
  } catch (err) {
    console.error('Failed to list meeting requests:', err);
    return res.status(500).json({ error: 'Failed to fetch meeting requests.' });
  }
}

/**
 * GET /api/admin/meeting-requests/:id
 */
async function getMeetingRequest(req, res) {
  const { id } = req.params;

  try {
    const request = await prisma.meetingRequest.findUnique({ where: { id } });

    if (!request) {
      return res.status(404).json({ error: 'Meeting request not found.' });
    }

    return res.json(request);
  } catch (err) {
    console.error('Failed to get meeting request:', err);
    return res.status(500).json({ error: 'Failed to fetch meeting request.' });
  }
}

/**
 * PATCH /api/admin/meeting-requests/:id
 * Body: { status?, adminNotes? }
 */
async function updateMeetingRequest(req, res) {
  const { id } = req.params;
  const { status, adminNotes } = req.body || {};

  const updates = {};

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Valid values: ${VALID_STATUSES.join(', ')}.` });
    }
    updates.status = status;
  }

  if (adminNotes !== undefined) {
    updates.adminNotes = adminNotes || null;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }

  try {
    const request = await prisma.meetingRequest.update({
      where: { id },
      data: updates,
    });

    return res.json(request);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Meeting request not found.' });
    }
    console.error('Failed to update meeting request:', err);
    return res.status(500).json({ error: 'Failed to update meeting request.' });
  }
}

/**
 * DELETE /api/admin/meeting-requests/:id
 */
async function deleteMeetingRequest(req, res) {
  const { id } = req.params;

  try {
    await prisma.meetingRequest.delete({ where: { id } });
    return res.json({ message: 'Meeting request deleted.' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Meeting request not found.' });
    }
    console.error('Failed to delete meeting request:', err);
    return res.status(500).json({ error: 'Failed to delete meeting request.' });
  }
}

module.exports = {
  listMeetingRequests,
  getMeetingRequest,
  updateMeetingRequest,
  deleteMeetingRequest,
};
