const prisma = require('../lib/prisma');
const r2Service = require('../services/r2Service');

const VALID_STATUSES = ['new', 'contacted', 'qualified', 'archived'];

/**
 * GET /api/admin/quote-inquiries
 * Query params: status, q (search fullName/email/projectName), page, pageSize
 */
async function listQuoteInquiries(req, res) {
  const { status, q, page = '1', pageSize = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = {};

  if (status && VALID_STATUSES.includes(status)) {
    where.status = status;
  }

  if (q && typeof q === 'string' && q.trim()) {
    const search = q.trim();
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { projectName: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [inquiries, total] = await Promise.all([
      prisma.quoteInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSizeNum,
        select: {
          id: true,
          status: true,
          fullName: true,
          company: true,
          email: true,
          phone: true,
          projectType: true,
          projectCategory: true,
          projectName: true,
          budgetRange: true,
          urgency: true,
          ndaRequested: true,
          createdAt: true,
          _count: { select: { attachments: true } },
        },
      }),
      prisma.quoteInquiry.count({ where }),
    ]);

    return res.json({
      data: inquiries,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    });
  } catch (err) {
    console.error('Failed to list quote inquiries:', err);
    return res.status(500).json({ error: 'Failed to fetch inquiries.' });
  }
}

/**
 * GET /api/admin/quote-inquiries/:id
 */
async function getQuoteInquiry(req, res) {
  const { id } = req.params;

  try {
    const inquiry = await prisma.quoteInquiry.findUnique({
      where: { id },
      include: {
        attachments: {
          select: {
            id: true,
            fileName: true,
            contentType: true,
            size: true,
            r2Key: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }

    return res.json(inquiry);
  } catch (err) {
    console.error('Failed to get quote inquiry:', err);
    return res.status(500).json({ error: 'Failed to fetch inquiry.' });
  }
}

/**
 * PATCH /api/admin/quote-inquiries/:id
 * Body: { status?, adminNotes? }
 */
async function updateQuoteInquiry(req, res) {
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
    const inquiry = await prisma.quoteInquiry.update({
      where: { id },
      data: updates,
    });

    return res.json(inquiry);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }
    console.error('Failed to update quote inquiry:', err);
    return res.status(500).json({ error: 'Failed to update inquiry.' });
  }
}

/**
 * DELETE /api/admin/quote-inquiries/:id
 * Cascades to QuoteAttachment rows + deletes R2 objects
 */
async function deleteQuoteInquiry(req, res) {
  const { id } = req.params;

  try {
    // Fetch attachment keys before deleting
    const attachments = await prisma.quoteAttachment.findMany({
      where: { inquiryId: id },
      select: { r2Key: true },
    });

    await prisma.quoteInquiry.delete({ where: { id } });

    // Delete R2 objects after DB delete succeeds (best-effort)
    for (const att of attachments) {
      r2Service.deleteFile(att.r2Key).catch((err) => {
        console.error(`Failed to delete R2 key ${att.r2Key}:`, err);
      });
    }

    return res.json({ message: 'Inquiry deleted.' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }
    console.error('Failed to delete quote inquiry:', err);
    return res.status(500).json({ error: 'Failed to delete inquiry.' });
  }
}

/**
 * GET /api/admin/quote-inquiries/:id/attachments/:attId/download
 * Streams the file from R2 with Content-Disposition: attachment
 */
async function downloadAttachment(req, res) {
  const { id, attId } = req.params;

  try {
    const attachment = await prisma.quoteAttachment.findFirst({
      where: { id: attId, inquiryId: id },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found.' });
    }

    const buffer = await r2Service.getFile(attachment.r2Key);

    res.setHeader('Content-Type', attachment.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.fileName)}"`
    );
    res.setHeader('Content-Length', buffer.length);

    return res.end(buffer);
  } catch (err) {
    console.error('Failed to download attachment:', err);
    return res.status(500).json({ error: 'Failed to download attachment.' });
  }
}

module.exports = {
  listQuoteInquiries,
  getQuoteInquiry,
  updateQuoteInquiry,
  deleteQuoteInquiry,
  downloadAttachment,
};
