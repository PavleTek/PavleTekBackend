const prisma = require('../lib/prisma');
const { sendEmail } = require('../services/emailService');

// Get all sender emails
const getAllEmails = async (req, res) => {
  try {
    const emails = await prisma.emailSender.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      message: 'Email senders retrieved successfully',
      emails: emails,
    });
  } catch (error) {
    console.error('Get all emails error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a specific email sender by ID
const getEmailById = async (req, res) => {
  try {
    const { id } = req.params;
    const emailId = parseInt(id);

    if (isNaN(emailId)) {
      res.status(400).json({ error: 'Invalid email ID' });
      return;
    }

    const email = await prisma.emailSender.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      res.status(404).json({ error: 'Email sender not found' });
      return;
    }

    res.status(200).json({
      message: 'Email sender retrieved successfully',
      email: email,
    });
  } catch (error) {
    console.error('Get email by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new email sender
const createEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingEmail = await prisma.emailSender.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingEmail) {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }

    const newEmail = await prisma.emailSender.create({
      data: {
        email: normalizedEmail,
      },
    });

    res.status(201).json({
      message: 'Email sender created successfully',
      email: newEmail,
    });
  } catch (error) {
    console.error('Create email error:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update an email sender
const updateEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const emailId = parseInt(id);
    const { email } = req.body;

    if (isNaN(emailId)) {
      res.status(400).json({ error: 'Invalid email ID' });
      return;
    }

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Get the current email sender to check existing email
    const currentEmailSender = await prisma.emailSender.findUnique({
      where: { id: emailId },
    });

    if (!currentEmailSender) {
      res.status(404).json({ error: 'Email sender not found' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const updateData = {};

    if (email) {
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }
      updateData.email = email.toLowerCase().trim();
    }

    const existingEmail = await prisma.emailSender.findUnique({
      where: { email: updateData.email },
    });

    if (existingEmail && existingEmail.id !== emailId) {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }

    const updatedEmail = await prisma.emailSender.update({
      where: { id: emailId },
      data: updateData,
    });

    res.status(200).json({
      message: 'Email sender updated successfully',
      email: updatedEmail,
    });
  } catch (error) {
    console.error('Update email error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Email sender not found' });
      return;
    }
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete an email sender
const deleteEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const emailId = parseInt(id);

    if (isNaN(emailId)) {
      res.status(400).json({ error: 'Invalid email ID' });
      return;
    }

    await prisma.emailSender.delete({
      where: { id: emailId },
    });

    // Check if any email senders remain
    const remainingEmailSenders = await prisma.emailSender.count();

    // Get configuration
    const config = await prisma.configuration.findFirst();

    if (remainingEmailSenders === 0) {
      // If no email senders remain and 2FA is enabled, auto-disable it
      if (config && config.twoFactorEnabled) {
        await prisma.configuration.update({
          where: { id: config.id },
          data: { 
            twoFactorEnabled: false,
            recoveryEmailSenderId: null
          }
        });
      } else if (config) {
        // Clear recovery email even if 2FA is disabled
        await prisma.configuration.update({
          where: { id: config.id },
          data: { recoveryEmailSenderId: null }
        });
      }
    } else {
      // If deleted email was the recovery email, clear it and disable 2FA
      // Users will keep their 2FA setup but won't be required to use it until 2FA is re-enabled
      if (config && config.recoveryEmailSenderId === emailId) {
        await prisma.configuration.update({
          where: { id: config.id },
          data: { 
            recoveryEmailSenderId: null,
            twoFactorEnabled: false
          }
        });
      }
    }

    res.status(200).json({
      message: 'Email sender deleted successfully',
    });
  } catch (error) {
    console.error('Delete email error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Email sender not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send test email (debug version)
const sendTestEmail = async (req, res) => {

  try {
    const { fromEmail, toEmails, ccEmails, bccEmails, subject, content } = req.body;

    if (!fromEmail || !toEmails || !subject || !content) {
      console.warn("⚠️ Missing required fields", { fromEmail, toEmails, subject, content });
      res.status(400).json({ error: 'fromEmail, toEmails, subject, and content are required' });
      return;
    }

    const parseEmailArray = (emails) => {
      if (!emails) return [];
      if (Array.isArray(emails)) return emails;
      if (typeof emails === 'string') {
        try {
          const parsed = JSON.parse(emails);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          const split = emails.split(',').map(e => e.trim()).filter(e => e);
          return split;
        }
      }
      return [];
    };

    const toEmailsArray = parseEmailArray(toEmails);
    const ccEmailsArray = parseEmailArray(ccEmails);
    const bccEmailsArray = parseEmailArray(bccEmails);

    if (toEmailsArray.length === 0) {
      console.warn("⚠️ No recipients found");
      res.status(400).json({ error: 'At least one recipient email is required' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(fromEmail)) {
      console.warn("⚠️ Invalid fromEmail:", fromEmail);
      res.status(400).json({ error: 'Invalid fromEmail format' });
      return;
    }

    const validateEmailArray = (emails, fieldName) => {
      for (const email of emails) {
        if (!emailRegex.test(email)) {
          console.warn(`⚠️ Invalid email format in ${fieldName}:`, email);
          res.status(400).json({ error: `Invalid email format in ${fieldName}: ${email}` });
          return false;
        }
      }
      return true;
    };

    if (!validateEmailArray(toEmailsArray, 'toEmails')) return;
    if (ccEmailsArray.length > 0 && !validateEmailArray(ccEmailsArray, 'ccEmails')) return;
    if (bccEmailsArray.length > 0 && !validateEmailArray(bccEmailsArray, 'bccEmails')) return;

    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        attachments.push({
          filename: file.originalname,
          content: file.buffer,
          contentType: file.mimetype,
        });
      }
    } else {
    }

    const emailOptions = {
      fromEmail: fromEmail.toLowerCase().trim(),
      toEmails: toEmailsArray.map(e => e.toLowerCase().trim()),
      ccEmails: ccEmailsArray.length > 0 ? ccEmailsArray.map(e => e.toLowerCase().trim()) : undefined,
      bccEmails: bccEmailsArray.length > 0 ? bccEmailsArray.map(e => e.toLowerCase().trim()) : undefined,
      subject: subject,
      content: content,
      isHtml: false,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const result = await sendEmail(emailOptions);

    res.status(200).json({
      message: 'Test email sent successfully',
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("💥 Send test email error:", {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    res.status(500).json({ error: error.message || 'Failed to send test email' });
  }
};


module.exports = {
  getAllEmails,
  getEmailById,
  createEmail,
  updateEmail,
  deleteEmail,
  sendTestEmail,
};

