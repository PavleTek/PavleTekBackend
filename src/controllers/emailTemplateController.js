const prisma = require('../lib/prisma');

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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      message: 'Email templates retrieved successfully',
      emailTemplates: emailTemplates,
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
      },
    });

    if (!emailTemplate) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }

    res.status(200).json({
      message: 'Email template retrieved successfully',
      emailTemplate: emailTemplate,
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
    } = req.body;

    const userId = req.user?.id;

    const templateData = {
      description: description || null,
      subject: subject || null,
      content: content || null,
      destinationEmail: destinationEmail || null,
      ccEmail: ccEmail || null,
      bccEmail: bccEmail || null,
      fromEmail: fromEmail || null,
      createdById: userId || null,
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
      },
    });

    res.status(201).json({
      message: 'Email template created successfully',
      emailTemplate: newEmailTemplate,
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

    const updateData = {};
    if (description !== undefined) updateData.description = description || null;
    if (subject !== undefined) updateData.subject = subject || null;
    if (content !== undefined) updateData.content = content || null;
    if (destinationEmail !== undefined) updateData.destinationEmail = destinationEmail || null;
    if (ccEmail !== undefined) updateData.ccEmail = ccEmail || null;
    if (bccEmail !== undefined) updateData.bccEmail = bccEmail || null;
    if (fromEmail !== undefined) updateData.fromEmail = fromEmail || null;

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
      },
    });

    res.status(200).json({
      message: 'Email template updated successfully',
      emailTemplate: updatedTemplate,
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

