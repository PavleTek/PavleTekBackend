const prisma = require('../lib/prisma');
const r2Service = require('../services/r2Service');
const { sendQuoteInquiryNotification, sendMeetingRequestNotification } = require('../services/notificationEmailService');

// Simple in-memory rate limiter: max 10 requests per IP per hour
const rateLimitStore = new Map();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Sanitize a filename for use as part of an R2 key
function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
}

/**
 * POST /api/public/quote-inquiries
 * Multipart: `payload` (JSON string) + up to 5 `attachments` files
 */
async function createQuoteInquiry(req, res) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  let payload;
  try {
    const raw = req.body?.payload;
    if (!raw) {
      return res.status(400).json({ error: 'Missing payload field.' });
    }
    payload = JSON.parse(raw);
  } catch {
    return res.status(400).json({ error: 'Invalid payload JSON.' });
  }

  const {
    fullName,
    company,
    role,
    email,
    phone,
    timezone,
    contactMethod,
    contactTime,
    projectType,
    projectCategory,
    projectName,
    description,
    goals,
    users,
    metrics,
    keyFeatures,
    technologyIds,
    startDate,
    endDate,
    urgency,
    deadlineHard,
    budgetRange,
    fundingSource,
    engineerCount,
    seniorityJunior,
    seniorityMid,
    senioritySenior,
    seniorityLead,
    requiredSkills,
    repoUrl,
    currentStack,
    painPoints,
    ndaRequested,
    referral,
    notes,
  } = payload;

  // Required: identity + reachability only (project scope fields optional)
  if (!fullName || !email) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  let inquiry;
  try {
    inquiry = await prisma.quoteInquiry.create({
      data: {
        fullName,
        company: company || null,
        role: role || null,
        email,
        phone: phone || null,
        timezone: timezone || null,
        contactMethod: contactMethod || 'email',
        contactTime: contactTime || null,
        projectType: projectType || 'new_build',
        projectCategory: projectCategory || 'web',
        projectName: typeof projectName === 'string' ? projectName.trim() : '',
        description: typeof description === 'string' ? description.trim() : '',
        goals: typeof goals === 'string' ? goals.trim() : '',
        users: users || null,
        metrics: metrics || null,
        keyFeatures: Array.isArray(keyFeatures) ? keyFeatures : [],
        technologyIds: Array.isArray(technologyIds) ? technologyIds : [],
        startDate: startDate || null,
        endDate: endDate || null,
        urgency: urgency || 'flexible',
        deadlineHard: Boolean(deadlineHard),
        budgetRange: budgetRange || 'unknown',
        fundingSource: fundingSource || null,
        engineerCount: engineerCount != null ? parseInt(engineerCount) : null,
        seniorityJunior: parseInt(seniorityJunior) || 0,
        seniorityMid: parseInt(seniorityMid) || 0,
        senioritySenior: parseInt(senioritySenior) || 0,
        seniorityLead: parseInt(seniorityLead) || 0,
        requiredSkills: requiredSkills || null,
        repoUrl: repoUrl || null,
        currentStack: currentStack || null,
        painPoints: painPoints || null,
        ndaRequested: Boolean(ndaRequested),
        referral: referral || null,
        notes: notes || null,
        ipAddress: ip,
        userAgent: req.get('user-agent') || null,
      },
    });
  } catch (err) {
    console.error('Failed to create quote inquiry:', err);
    return res.status(500).json({ error: 'Failed to save inquiry.' });
  }

  // Upload attachments to R2
  const files = req.files || [];
  const uploadedKeys = [];

  for (const file of files) {
    const safeName = sanitizeFileName(file.originalname);
    const r2Key = `quote-inquiries/${inquiry.id}/${Date.now()}_${safeName}`;

    try {
      await r2Service.uploadFile(r2Key, file.buffer, file.mimetype);
      uploadedKeys.push(r2Key);

      await prisma.quoteAttachment.create({
        data: {
          inquiryId: inquiry.id,
          fileName: file.originalname,
          contentType: file.mimetype,
          size: file.size,
          r2Key,
        },
      });
    } catch (err) {
      console.error(`Failed to upload attachment ${file.originalname}:`, err);
      // Best-effort cleanup of already-uploaded keys
      for (const key of uploadedKeys) {
        r2Service.deleteFile(key).catch(() => {});
      }
      // Delete the inquiry so the client can retry cleanly
      prisma.quoteInquiry.delete({ where: { id: inquiry.id } }).catch(() => {});
      return res.status(500).json({ error: 'Failed to upload attachments.' });
    }
  }

  // Send notification email (fire and forget)
  sendQuoteInquiryNotification(inquiry, files).catch((err) => {
    console.error('[notify] Failed to send quote inquiry notification:', err);
  });

  return res.status(201).json({ id: inquiry.id });
}

/**
 * POST /api/public/meeting-requests
 * JSON body: { fullName, email, message? }
 */
async function createMeetingRequest(req, res) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const { fullName, email, message } = req.body || {};

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'fullName is required (min 2 chars).' });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }

  if (message && typeof message === 'string' && message.length > 8000) {
    return res.status(400).json({ error: 'Message must be 8000 characters or fewer.' });
  }

  try {
    const request = await prisma.meetingRequest.create({
      data: {
        fullName: fullName.trim(),
        email: email.trim(),
        message: message?.trim() || null,
        ipAddress: ip,
        userAgent: req.get('user-agent') || null,
      },
    });

    // Send notification email (fire and forget)
    sendMeetingRequestNotification(request).catch((err) => {
      console.error('[notify] Failed to send meeting request notification:', err);
    });

    return res.status(201).json({ id: request.id });
  } catch (err) {
    console.error('Failed to create meeting request:', err);
    return res.status(500).json({ error: 'Failed to save meeting request.' });
  }
}

module.exports = {
  createQuoteInquiry,
  createMeetingRequest,
};
