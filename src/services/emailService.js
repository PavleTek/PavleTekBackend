const { Resend } = require("resend");
const prisma = require("../lib/prisma");

let resendClient = null;

function ensureResendClient() {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("❌ [Resend] RESEND_API_KEY is not configured");
    throw new Error("Resend API key is required. Please set RESEND_API_KEY in your environment.");
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

function normalizeEmailList(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((email) => (typeof email === "string" ? email.trim() : email))
      .filter((email) => typeof email === "string" && email.length > 0);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

function normalizeAttachments(attachments) {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  return attachments
    .map((attachment) => {
      const filename = attachment?.filename || attachment?.name;
      const mimeType = attachment?.contentType || attachment?.mimeType || attachment?.type;

      let bufferContent = attachment?.content || attachment?.data || attachment?.buffer;
      if (!bufferContent) {
        return null;
      }

      if (typeof bufferContent === "string") {
        // Assume already base64 encoded
        return {
          filename,
          content: bufferContent,
          mime_type: mimeType,
        };
      }

      if (!Buffer.isBuffer(bufferContent)) {
        bufferContent = Buffer.from(bufferContent);
      }

      return {
        filename: filename || "attachment",
        content: bufferContent.toString("base64"),
        mime_type: mimeType,
      };
    })
    .filter(Boolean);
}

async function sendViaResend(options) {
  const resend = ensureResendClient();

  const toList = normalizeEmailList(options.toEmails);
  const ccList = normalizeEmailList(options.ccEmails);
  const bccList = normalizeEmailList(options.bccEmails);

  if (toList.length === 0) {
    throw new Error("At least one recipient email is required to send via Resend.");
  }

  const payload = {
    from: options.fromEmail,
    to: toList,
    subject: options.subject,
    ...(options.isHtml ? { html: options.content } : { text: options.content }),
  };

  if (ccList.length > 0) {
    payload.cc = ccList;
  }

  if (bccList.length > 0) {
    payload.bcc = bccList;
  }

  const resendAttachments = normalizeAttachments(options.attachments);
  if (resendAttachments.length > 0) {
    payload.attachments = resendAttachments;
  }

  try {
    const response = await resend.emails.send(payload);
    return response;
  } catch (error) {
    console.error("❌ [sendViaResend] Failed to send email via Resend:", {
      message: error.message,
      stack: error.stack,
      statusCode: error?.statusCode,
      name: error.name,
    });
    throw error;
  }
}

/**
 * Main reusable email sending function
 * @param {Object} options - Email options
 * @param {string} options.fromEmail - Sender email address (must be in EmailSender table)
 * @param {string|string[]} options.toEmails - Recipient email(s)
 * @param {string|string[]} [options.ccEmails] - CC email(s)
 * @param {string|string[]} [options.bccEmails] - BCC email(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.content - Email content (text or HTML)
 * @param {boolean} [options.isHtml=false] - Whether content is HTML
 * @param {Array} [options.attachments] - Email attachments array
 * @returns {Promise} - Email send result
 */
async function sendEmail(options) {

  const { fromEmail, toEmails, subject, content } = options;

  if (!fromEmail || !toEmails || !subject || !content) {
    console.error("❌ [sendEmail] Missing required parameters:", {
      hasFromEmail: !!fromEmail,
      hasToEmails: !!toEmails,
      hasSubject: !!subject,
      hasContent: !!content,
    });
    throw new Error("Missing required email parameters: fromEmail, toEmails, subject, and content are required");
  }

  const normalizedFromEmail = fromEmail.toLowerCase().trim();

  const emailSender = await prisma.emailSender.findUnique({
    where: { email: normalizedFromEmail },
  });

  if (!emailSender) {
    console.error("❌ [sendEmail] Email sender not found in database", {
      searchedEmail: normalizedFromEmail,
    });
    throw new Error(`Email sender ${fromEmail} not found in database. Please add it first.`);
  }

  const normalizedOptions = {
    ...options,
    fromEmail: normalizedFromEmail,
    toEmails,
    ccEmails: options.ccEmails,
    bccEmails: options.bccEmails,
    isHtml: options.isHtml || false,
  };

  try {
    const result = await sendViaResend(normalizedOptions);
    return result;
  } catch (error) {
    console.error("❌ [sendEmail] Error details:", {
      message: error.message,
      stack: error.stack,
      statusCode: error?.statusCode,
      name: error.name,
    });
    throw error;
  }
}

module.exports = {
  sendEmail,
  sendViaResend,
};
