const prisma = require('../lib/prisma');

// Helper function to merge contact emails with hard-typed emails
const mergeEmails = (hardTypedEmails, contacts, type) => {
  const hardTyped = Array.isArray(hardTypedEmails) ? hardTypedEmails : [];
  const contactEmails = contacts
    .filter(c => c.type === type && c.contact && c.contact.email)
    .map(c => c.contact.email)
    .filter(email => email); // Remove null/undefined emails
  
  // Combine and deduplicate
  const allEmails = [...new Set([...hardTyped, ...contactEmails])];
  return allEmails.length > 0 ? allEmails : null;
};

// Get all email templates
const getAllEmailTemplates = async (req, res) => {
  try {
    const emailTemplates = await prisma.emailTemplate.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
            lastName: true,
          },
        },
        contacts: {
          include: {
            contact: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Merge contact emails with hard-typed emails
    const templatesWithMergedEmails = emailTemplates.map(template => {
      const toContacts = template.contacts.filter(c => c.type === 'to');
      const ccContacts = template.contacts.filter(c => c.type === 'cc');
      const bccContacts = template.contacts.filter(c => c.type === 'bcc');

      return {
        ...template,
        destinationEmail: mergeEmails(template.destinationEmail, toContacts, 'to'),
        ccEmail: mergeEmails(template.ccEmail, ccContacts, 'cc'),
        bccEmail: mergeEmails(template.bccEmail, bccContacts, 'bcc'),
        toContactIds: toContacts.map(c => c.contactId),
        ccContactIds: ccContacts.map(c => c.contactId),
        bccContactIds: bccContacts.map(c => c.contactId),
      };
    });

    res.status(200).json({
      message: 'Email templates retrieved successfully',
      emailTemplates: templatesWithMergedEmails,
    });
  } catch (error) {
    console.error('Get all email templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a specific email template by ID
const getEmailTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const templateId = parseInt(id);

    if (isNaN(templateId)) {
      res.status(400).json({ error: 'Invalid email template ID' });
      return;
    }

    const emailTemplate = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
            lastName: true,
          },
        },
        contacts: {
          include: {
            contact: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!emailTemplate) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }

    // Merge contact emails with hard-typed emails
    const toContacts = emailTemplate.contacts.filter(c => c.type === 'to');
    const ccContacts = emailTemplate.contacts.filter(c => c.type === 'cc');
    const bccContacts = emailTemplate.contacts.filter(c => c.type === 'bcc');

    const templateWithMergedEmails = {
      ...emailTemplate,
      destinationEmail: mergeEmails(emailTemplate.destinationEmail, toContacts, 'to'),
      ccEmail: mergeEmails(emailTemplate.ccEmail, ccContacts, 'cc'),
      bccEmail: mergeEmails(emailTemplate.bccEmail, bccContacts, 'bcc'),
      toContactIds: toContacts.map(c => c.contactId),
      ccContactIds: ccContacts.map(c => c.contactId),
      bccContactIds: bccContacts.map(c => c.contactId),
    };

    res.status(200).json({
      message: 'Email template retrieved successfully',
      emailTemplate: templateWithMergedEmails,
    });
  } catch (error) {
    console.error('Get email template by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new email template
const createEmailTemplate = async (req, res) => {
  try {
    const {
      description,
      subject,
      content,
      destinationEmail,
      ccEmail,
      bccEmail,
      fromEmail,
      toContactIds,
      ccContactIds,
      bccContactIds,
    } = req.body;

    const userId = req.user?.id;

    // Separate hard-typed emails from contact emails
    const hardTypedToEmails = Array.isArray(destinationEmail) 
      ? destinationEmail.filter(email => typeof email === 'string')
      : (destinationEmail ? [destinationEmail] : []);
    const hardTypedCcEmails = Array.isArray(ccEmail)
      ? ccEmail.filter(email => typeof email === 'string')
      : (ccEmail ? [ccEmail] : []);
    const hardTypedBccEmails = Array.isArray(bccEmail)
      ? bccEmail.filter(email => typeof email === 'string')
      : (bccEmail ? [bccEmail] : []);

    const templateData = {
      description: description || null,
      subject: subject || null,
      content: content || null,
      destinationEmail: hardTypedToEmails.length > 0 ? hardTypedToEmails : null,
      ccEmail: hardTypedCcEmails.length > 0 ? hardTypedCcEmails : null,
      bccEmail: hardTypedBccEmails.length > 0 ? hardTypedBccEmails : null,
      fromEmail: fromEmail || null,
      createdById: userId || null,
      contacts: {
        create: [
          ...(Array.isArray(toContactIds) ? toContactIds.map(contactId => ({
            contactId: parseInt(contactId),
            type: 'to',
          })) : []),
          ...(Array.isArray(ccContactIds) ? ccContactIds.map(contactId => ({
            contactId: parseInt(contactId),
            type: 'cc',
          })) : []),
          ...(Array.isArray(bccContactIds) ? bccContactIds.map(contactId => ({
            contactId: parseInt(contactId),
            type: 'bcc',
          })) : []),
        ],
      },
    };

    const newEmailTemplate = await prisma.emailTemplate.create({
      data: templateData,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
            lastName: true,
          },
        },
        contacts: {
          include: {
            contact: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Merge contact emails with hard-typed emails
    const toContacts = newEmailTemplate.contacts.filter(c => c.type === 'to');
    const ccContacts = newEmailTemplate.contacts.filter(c => c.type === 'cc');
    const bccContacts = newEmailTemplate.contacts.filter(c => c.type === 'bcc');

    const templateWithMergedEmails = {
      ...newEmailTemplate,
      destinationEmail: mergeEmails(newEmailTemplate.destinationEmail, toContacts, 'to'),
      ccEmail: mergeEmails(newEmailTemplate.ccEmail, ccContacts, 'cc'),
      bccEmail: mergeEmails(newEmailTemplate.bccEmail, bccContacts, 'bcc'),
      toContactIds: toContacts.map(c => c.contactId),
      ccContactIds: ccContacts.map(c => c.contactId),
      bccContactIds: bccContacts.map(c => c.contactId),
    };

    res.status(201).json({
      message: 'Email template created successfully',
      emailTemplate: templateWithMergedEmails,
    });
  } catch (error) {
    console.error('Create email template error:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Email template already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update an email template
const updateEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const templateId = parseInt(id);
    const {
      description,
      subject,
      content,
      destinationEmail,
      ccEmail,
      bccEmail,
      fromEmail,
      toContactIds,
      ccContactIds,
      bccContactIds,
    } = req.body;

    if (isNaN(templateId)) {
      res.status(400).json({ error: 'Invalid email template ID' });
      return;
    }

    const currentTemplate = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });

    if (!currentTemplate) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }

    // Separate hard-typed emails from contact emails if provided
    let hardTypedToEmails = null;
    let hardTypedCcEmails = null;
    let hardTypedBccEmails = null;

    if (destinationEmail !== undefined) {
      hardTypedToEmails = Array.isArray(destinationEmail)
        ? destinationEmail.filter(email => typeof email === 'string')
        : (destinationEmail ? [destinationEmail] : []);
      if (hardTypedToEmails.length === 0) hardTypedToEmails = null;
    }

    if (ccEmail !== undefined) {
      hardTypedCcEmails = Array.isArray(ccEmail)
        ? ccEmail.filter(email => typeof email === 'string')
        : (ccEmail ? [ccEmail] : []);
      if (hardTypedCcEmails.length === 0) hardTypedCcEmails = null;
    }

    if (bccEmail !== undefined) {
      hardTypedBccEmails = Array.isArray(bccEmail)
        ? bccEmail.filter(email => typeof email === 'string')
        : (bccEmail ? [bccEmail] : []);
      if (hardTypedBccEmails.length === 0) hardTypedBccEmails = null;
    }

    const updateData = {};
    if (description !== undefined) updateData.description = description || null;
    if (subject !== undefined) updateData.subject = subject || null;
    if (content !== undefined) updateData.content = content || null;
    if (destinationEmail !== undefined) updateData.destinationEmail = hardTypedToEmails;
    if (ccEmail !== undefined) updateData.ccEmail = hardTypedCcEmails;
    if (bccEmail !== undefined) updateData.bccEmail = hardTypedBccEmails;
    if (fromEmail !== undefined) updateData.fromEmail = fromEmail || null;

    // Handle contact relationships
    if (toContactIds !== undefined || ccContactIds !== undefined || bccContactIds !== undefined) {
      // Delete existing contact relationships
      await prisma.emailTemplateContact.deleteMany({
        where: { emailTemplateId: templateId },
      });

      // Create new contact relationships
      const contactsToCreate = [];
      if (Array.isArray(toContactIds)) {
        contactsToCreate.push(...toContactIds.map(contactId => ({
          contactId: parseInt(contactId),
          type: 'to',
        })));
      }
      if (Array.isArray(ccContactIds)) {
        contactsToCreate.push(...ccContactIds.map(contactId => ({
          contactId: parseInt(contactId),
          type: 'cc',
        })));
      }
      if (Array.isArray(bccContactIds)) {
        contactsToCreate.push(...bccContactIds.map(contactId => ({
          contactId: parseInt(contactId),
          type: 'bcc',
        })));
      }

      if (contactsToCreate.length > 0) {
        updateData.contacts = {
          create: contactsToCreate,
        };
      }
    }

    const updatedTemplate = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
            lastName: true,
          },
        },
        contacts: {
          include: {
            contact: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Merge contact emails with hard-typed emails
    const toContacts = updatedTemplate.contacts.filter(c => c.type === 'to');
    const ccContacts = updatedTemplate.contacts.filter(c => c.type === 'cc');
    const bccContacts = updatedTemplate.contacts.filter(c => c.type === 'bcc');

    const templateWithMergedEmails = {
      ...updatedTemplate,
      destinationEmail: mergeEmails(updatedTemplate.destinationEmail, toContacts, 'to'),
      ccEmail: mergeEmails(updatedTemplate.ccEmail, ccContacts, 'cc'),
      bccEmail: mergeEmails(updatedTemplate.bccEmail, bccContacts, 'bcc'),
      toContactIds: toContacts.map(c => c.contactId),
      ccContactIds: ccContacts.map(c => c.contactId),
      bccContactIds: bccContacts.map(c => c.contactId),
    };

    res.status(200).json({
      message: 'Email template updated successfully',
      emailTemplate: templateWithMergedEmails,
    });
  } catch (error) {
    console.error('Update email template error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete an email template
const deleteEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const templateId = parseInt(id);

    if (isNaN(templateId)) {
      res.status(400).json({ error: 'Invalid email template ID' });
      return;
    }

    const emailTemplate = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });

    if (!emailTemplate) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }

    await prisma.emailTemplate.delete({
      where: { id: templateId },
    });

    res.status(200).json({
      message: 'Email template deleted successfully',
    });
  } catch (error) {
    console.error('Delete email template error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
};

