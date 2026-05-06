const prisma = require("../lib/prisma");
const { sendEmail } = require("./emailService");

/** Trim trailing slash; empty uses fallback. */
function originOrFallback(raw, fallback) {
  const s = raw != null && String(raw).trim() ? String(raw).trim() : "";
  if (!s) return fallback.replace(/\/$/, "");
  return s.replace(/\/$/, "");
}

/** Logo + static assets in notification HTML (landing site). */
function getLandingPageUrl() {
  return originOrFallback(
    process.env.LandingPageURL || process.env.LANDING_PAGE_ORIGIN,
    "https://pavletek.com"
  );
}

/** CTA links open the admin dashboard (PavleTekFront). */
function getAdminPageUrl() {
  return originOrFallback(
    process.env.AdminPageURL || process.env.ADMIN_URL,
    "http://localhost:5174"
  );
}

/**
 * Loads the notification configuration from the database.
 * Returns null if notifications are disabled or misconfigured.
 */
async function loadNotificationConfig() {
  try {
    const config = await prisma.configuration.findFirst({
      include: {
        // notificationEmailSenderId is a field on Configuration, but we need the email
      }
    });

    if (!config || !config.inquiriesNotificationEmail || !config.notificationEmailSenderId) {
      return null;
    }

    const sender = await prisma.emailSender.findUnique({
      where: { id: config.notificationEmailSenderId }
    });

    if (!sender) {
      console.warn('[notify] Notification sender not found in database');
      return null;
    }

    return {
      recipientEmail: config.inquiriesNotificationEmail,
      fromEmail: sender.email,
      appName: config.appName || 'PavleTek'
    };
  } catch (error) {
    console.error('[notify] Failed to load notification config:', error);
    return null;
  }
}

/**
 * Generates the common HTML wrapper for notification emails.
 */
function getHtmlWrapper(content, title, ctaLink, ctaText) {
  const landingPageUrl = getLandingPageUrl();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #f7fafa;
          color: #0e1330;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          padding: 20px;
        }
        .card {
          background-color: #ffffff;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 22px 60px -20px rgba(30, 26, 120, 0.12);
          border: 1px solid rgba(30, 26, 120, 0.05);
        }
        .logo {
          margin-bottom: 32px;
          text-align: center;
        }
        .logo img {
          height: 48px;
          width: auto;
        }
        h1 {
          font-family: 'Space Grotesk', 'Inter', sans-serif;
          font-size: 24px;
          font-weight: 600;
          color: #1e1a78;
          margin: 0 0 16px 0;
          text-align: center;
        }
        .content {
          font-size: 16px;
          line-height: 1.6;
          color: #0e1330;
          margin-bottom: 32px;
        }
        .field-group {
          margin-bottom: 24px;
          padding: 20px;
          background-color: #f7fafa;
          border-radius: 16px;
          border: 1px solid rgba(30, 26, 120, 0.05);
        }
        .field {
          margin-bottom: 12px;
        }
        .field:last-child {
          margin-bottom: 0;
        }
        .label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
          margin-bottom: 4px;
          display: block;
        }
        .value {
          font-size: 14px;
          color: #0e1330;
        }
        .cta-container {
          text-align: center;
          margin-top: 32px;
        }
        .cta-button {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(to right, #7dd3c0, #3fb8a0);
          color: #13105a !important;
          text-decoration: none;
          font-weight: 600;
          border-radius: 12px;
          font-size: 14px;
          transition: opacity 0.2s;
        }
        .footer {
          margin-top: 32px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo">
            <img src="${landingPageUrl}/logo.png" alt="PavleTek Logo">
          </div>
          <h1>${title}</h1>
          <div class="content">
            ${content}
          </div>
          ${ctaLink ? `
            <div class="cta-container">
              <a href="${ctaLink}" class="cta-button">${ctaText}</a>
            </div>
          ` : ''}
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} PavleTek. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Sends a notification email for a new quote inquiry.
 */
async function sendQuoteInquiryNotification(inquiry, attachments = []) {
  const config = await loadNotificationConfig();
  if (!config) return;

  const adminUrl = getAdminPageUrl();
  const ctaLink = `${adminUrl}/submissions?tab=inquiries&id=${inquiry.id}`;

  const projectNameDisplay =
    inquiry.projectName && String(inquiry.projectName).trim()
      ? inquiry.projectName
      : '—';

  const fieldsHtml = `
    <div class="field-group">
      <div class="field">
        <span class="label">Project Name</span>
        <div class="value">${projectNameDisplay}</div>
      </div>
      <div class="field">
        <span class="label">Client Name</span>
        <div class="value">${inquiry.fullName}</div>
      </div>
      <div class="field">
        <span class="label">Email</span>
        <div class="value">${inquiry.email}</div>
      </div>
      ${inquiry.company ? `
        <div class="field">
          <span class="label">Company</span>
          <div class="value">${inquiry.company}</div>
        </div>
      ` : ''}
      <div class="field">
        <span class="label">Project Type</span>
        <div class="value">${inquiry.projectType}</div>
      </div>
      <div class="field">
        <span class="label">Budget Range</span>
        <div class="value">${inquiry.budgetRange}</div>
      </div>
      <div class="field">
        <span class="label">Attachments</span>
        <div class="value">${attachments.length > 0 ? `${attachments.length} file(s)` : 'None'}</div>
      </div>
    </div>
  `;

  const html = getHtmlWrapper(
    `<p>A new quote inquiry has been submitted through the landing page. Here is a summary:</p>${fieldsHtml}`,
    'New Quote Inquiry',
    ctaLink,
    'View Full Inquiry'
  );

  const subjectProject =
    inquiry.projectName && String(inquiry.projectName).trim()
      ? inquiry.projectName.trim()
      : 'No project name';

  return sendEmail({
    fromEmail: config.fromEmail,
    toEmails: [config.recipientEmail],
    subject: `[${config.appName}] New Quote Inquiry: ${subjectProject}`,
    content: html,
    isHtml: true
  });
}

/**
 * Sends a notification email for a new meeting request.
 */
async function sendMeetingRequestNotification(request) {
  const config = await loadNotificationConfig();
  if (!config) return;

  const adminUrl = getAdminPageUrl();
  const ctaLink = `${adminUrl}/submissions?tab=meetings&id=${request.id}`;

  const fieldsHtml = `
    <div class="field-group">
      <div class="field">
        <span class="label">Client Name</span>
        <div class="value">${request.fullName}</div>
      </div>
      <div class="field">
        <span class="label">Email</span>
        <div class="value">${request.email}</div>
      </div>
      ${request.message ? `
        <div class="field">
          <span class="label">Message</span>
          <div class="value">${request.message}</div>
        </div>
      ` : ''}
    </div>
  `;

  const html = getHtmlWrapper(
    `<p>A new meeting request has been submitted through the landing page. Here is a summary:</p>${fieldsHtml}`,
    'New Meeting Request',
    ctaLink,
    'View Request Details'
  );

  return sendEmail({
    fromEmail: config.fromEmail,
    toEmails: [config.recipientEmail],
    subject: `[${config.appName}] New Meeting Request from ${request.fullName}`,
    content: html,
    isHtml: true
  });
}

module.exports = {
  sendQuoteInquiryNotification,
  sendMeetingRequestNotification
};
