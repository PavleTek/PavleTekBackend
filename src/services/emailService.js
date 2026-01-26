const { Resend } = require("resend");
const prisma = require("../lib/prisma");

let resendClient = null;

function ensureResendClient() {
  if (resendClient) {
    return resendClient;
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("❌ [ensureResendClient] RESEND_API_KEY is not configured");
      throw new Error("Resend API key is required. Please set RESEND_API_KEY in your environment.");
    }

    resendClient = new Resend(apiKey);
    console.log("✅ [ensureResendClient] Resend client initialized successfully");
    return resendClient;
  } catch (error) {
    console.error("❌ [ensureResendClient] Failed to initialize Resend client:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw error;
  }
}

function normalizeEmailList(value) {
  try {
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
  } catch (error) {
    console.error("❌ [normalizeEmailList] Error normalizing email list:", {
      message: error.message,
      value: typeof value === "string" ? value : Array.isArray(value) ? `Array(${value.length})` : typeof value,
      stack: error.stack,
    });
    return [];
  }
}

function normalizeAttachments(attachments) {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  try {
    return attachments
      .map((attachment, index) => {
        try {
          const filename = attachment?.filename || attachment?.name;
          const mimeType = attachment?.contentType || attachment?.mimeType || attachment?.type;

          let bufferContent = attachment?.content || attachment?.data || attachment?.buffer;
          if (!bufferContent) {
            console.warn(`⚠️ [normalizeAttachments] Attachment at index ${index} has no content, skipping`);
            return null;
          }

          if (typeof bufferContent === "string") {
            // Assume already base64 encoded
            return {
              filename: filename || `attachment-${index}`,
              content: bufferContent,
              mime_type: mimeType,
            };
          }

          if (!Buffer.isBuffer(bufferContent)) {
            bufferContent = Buffer.from(bufferContent);
          }

          return {
            filename: filename || `attachment-${index}`,
            content: bufferContent.toString("base64"),
            mime_type: mimeType,
          };
        } catch (error) {
          console.error(`❌ [normalizeAttachments] Error processing attachment at index ${index}:`, {
            message: error.message,
            filename: attachment?.filename || attachment?.name,
            stack: error.stack,
          });
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    console.error("❌ [normalizeAttachments] Error normalizing attachments:", {
      message: error.message,
      attachmentCount: attachments?.length,
      stack: error.stack,
    });
    return [];
  }
}

async function sendViaResend(options) {
  try {
    const resend = ensureResendClient();

    const toList = normalizeEmailList(options.toEmails);
    const ccList = normalizeEmailList(options.ccEmails);
    const bccList = normalizeEmailList(options.bccEmails);

    if (toList.length === 0) {
      const error = new Error("At least one recipient email is required to send via Resend.");
      console.error("❌ [sendViaResend] Validation error:", {
        message: error.message,
        fromEmail: options.fromEmail,
        subject: options.subject,
      });
      throw error;
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

    console.log("📧 [sendViaResend] Attempting to send email:", {
      from: options.fromEmail,
      to: toList,
      cc: ccList.length > 0 ? ccList : undefined,
      bcc: bccList.length > 0 ? bccList : undefined,
      subject: options.subject,
      hasAttachments: resendAttachments.length > 0,
      attachmentCount: resendAttachments.length,
      isHtml: options.isHtml,
    });

    const response = await resend.emails.send(payload);
    
    console.log("✅ [sendViaResend] Email sent successfully:", {
      emailId: response?.data?.id,
      from: options.fromEmail,
      to: toList,
      subject: options.subject,
    });

    return response;
  } catch (error) {
    console.error("❌ [sendViaResend] Failed to send email via Resend:", {
      message: error.message,
      stack: error.stack,
      statusCode: error?.statusCode,
      name: error.name,
      fromEmail: options?.fromEmail,
      toEmails: options?.toEmails,
      subject: options?.subject,
      errorDetails: error?.response?.data || error?.response || undefined,
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
  try {
    const { fromEmail, toEmails, subject, content } = options;

    // Validate required parameters
    if (!fromEmail || !toEmails || !subject || !content) {
      const error = new Error("Missing required email parameters: fromEmail, toEmails, subject, and content are required");
      console.error("❌ [sendEmail] Missing required parameters:", {
        hasFromEmail: !!fromEmail,
        hasToEmails: !!toEmails,
        hasSubject: !!subject,
        hasContent: !!content,
        providedOptions: Object.keys(options),
      });
      throw error;
    }

    // Normalize and validate from email
    let normalizedFromEmail;
    try {
      normalizedFromEmail = fromEmail.toLowerCase().trim();
      if (!normalizedFromEmail || normalizedFromEmail.length === 0) {
        throw new Error("From email cannot be empty after normalization");
      }
    } catch (error) {
      console.error("❌ [sendEmail] Error normalizing from email:", {
        message: error.message,
        originalFromEmail: fromEmail,
        stack: error.stack,
      });
      throw new Error(`Invalid from email: ${fromEmail}`);
    }

    // Query database for email sender
    let emailSender;
    try {
      emailSender = await prisma.emailSender.findUnique({
        where: { email: normalizedFromEmail },
      });
    } catch (error) {
      console.error("❌ [sendEmail] Database error while fetching email sender:", {
        message: error.message,
        searchedEmail: normalizedFromEmail,
        stack: error.stack,
        errorCode: error?.code,
      });
      throw new Error(`Database error while checking email sender: ${error.message}`);
    }

    if (!emailSender) {
      const error = new Error(`Email sender ${fromEmail} not found in database. Please add it first.`);
      console.error("❌ [sendEmail] Email sender not found in database", {
        searchedEmail: normalizedFromEmail,
        originalFromEmail: fromEmail,
      });
      throw error;
    }

    // Prepare normalized options
    const normalizedOptions = {
      ...options,
      fromEmail: normalizedFromEmail,
      toEmails,
      ccEmails: options.ccEmails,
      bccEmails: options.bccEmails,
      isHtml: options.isHtml || false,
    };

    // Send email via Resend
    const result = await sendViaResend(normalizedOptions);
    
    console.log("✅ [sendEmail] Email sent successfully:", {
      fromEmail: normalizedFromEmail,
      toEmails: Array.isArray(toEmails) ? toEmails : [toEmails],
      subject: subject,
      emailId: result?.data?.id,
    });

    return result;
  } catch (error) {
    // Re-throw if it's already a well-formed error with logging
    if (error.message && error.stack) {
      console.error("❌ [sendEmail] Error sending email:", {
        message: error.message,
        stack: error.stack,
        statusCode: error?.statusCode,
        name: error.name,
        fromEmail: options?.fromEmail,
        toEmails: options?.toEmails,
        subject: options?.subject,
      });
      throw error;
    }

    // Handle unexpected errors
    console.error("❌ [sendEmail] Unexpected error:", {
      message: error?.message || "Unknown error",
      stack: error?.stack,
      error: error,
      options: {
        hasFromEmail: !!options?.fromEmail,
        hasToEmails: !!options?.toEmails,
        hasSubject: !!options?.subject,
        hasContent: !!options?.content,
      },
    });
    throw new Error(`Unexpected error in sendEmail: ${error?.message || "Unknown error"}`);
  }
}

module.exports = {
  sendEmail,
  sendViaResend,
};
