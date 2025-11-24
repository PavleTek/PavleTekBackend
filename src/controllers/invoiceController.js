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

// Get all invoices
const getAllInvoices = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        fromCompany: true,
        fromContact: true,
        toCompany: true,
        toContact: true,
        currency: true,
        emailTemplate: {
          include: {
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
        },
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

    // Merge contact emails with hard-typed emails for each invoice
    const invoicesWithMergedEmails = invoices.map(invoice => {
      if (invoice.emailTemplate) {
        const toContacts = invoice.emailTemplate.contacts.filter(c => c.type === 'to');
        const ccContacts = invoice.emailTemplate.contacts.filter(c => c.type === 'cc');
        const bccContacts = invoice.emailTemplate.contacts.filter(c => c.type === 'bcc');

        return {
          ...invoice,
          emailTemplate: {
            ...invoice.emailTemplate,
            destinationEmail: mergeEmails(invoice.emailTemplate.destinationEmail, toContacts, 'to'),
            ccEmail: mergeEmails(invoice.emailTemplate.ccEmail, ccContacts, 'cc'),
            bccEmail: mergeEmails(invoice.emailTemplate.bccEmail, bccContacts, 'bcc'),
          },
        };
      }
      return invoice;
    });

    res.status(200).json({
      message: 'Invoices retrieved successfully',
      invoices: invoicesWithMergedEmails,
    });
  } catch (error) {
    console.error('Get all invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a specific invoice by ID
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id);

    if (isNaN(invoiceId)) {
      res.status(400).json({ error: 'Invalid invoice ID' });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        fromCompany: true,
        fromContact: true,
        toCompany: true,
        toContact: true,
        currency: true,
        emailTemplate: {
          include: {
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
        },
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

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    // Merge contact emails with hard-typed emails if emailTemplate exists
    let invoiceWithMergedEmails = invoice;
    if (invoice.emailTemplate) {
      const toContacts = invoice.emailTemplate.contacts.filter(c => c.type === 'to');
      const ccContacts = invoice.emailTemplate.contacts.filter(c => c.type === 'cc');
      const bccContacts = invoice.emailTemplate.contacts.filter(c => c.type === 'bcc');

      invoiceWithMergedEmails = {
        ...invoice,
        emailTemplate: {
          ...invoice.emailTemplate,
          destinationEmail: mergeEmails(invoice.emailTemplate.destinationEmail, toContacts, 'to'),
          ccEmail: mergeEmails(invoice.emailTemplate.ccEmail, ccContacts, 'cc'),
          bccEmail: mergeEmails(invoice.emailTemplate.bccEmail, bccContacts, 'bcc'),
        },
      };
    }

    res.status(200).json({
      message: 'Invoice retrieved successfully',
      invoice: invoiceWithMergedEmails,
    });
  } catch (error) {
    console.error('Get invoice by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new invoice
const createInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      date,
      subtotal,
      taxRate,
      taxAmount,
      total,
      isTemplate,
      templateName,
      name,
      description,
      hasASDocument,
      ASDocument,
      sent,
      items,
      fromCompanyId,
      fromContactId,
      toCompanyId,
      toContactId,
      currencyId,
      emailTemplateId,
    } = req.body;

    const userId = req.user?.id;

    // Validate required fields
    if (invoiceNumber === undefined || date === undefined || subtotal === undefined || taxRate === undefined || taxAmount === undefined || total === undefined) {
      res.status(400).json({ error: 'Invoice number, date, subtotal, taxRate, taxAmount, and total are required' });
      return;
    }

    const invoiceData = {
      invoiceNumber: parseInt(invoiceNumber),
      date: new Date(date),
      subtotal: parseFloat(subtotal),
      taxRate: parseFloat(taxRate),
      taxAmount: parseFloat(taxAmount),
      total: parseFloat(total),
      isTemplate: isTemplate || false,
      templateName: templateName || null,
      name: name || null,
      description: description || null,
      hasASDocument: hasASDocument || false,
      ASDocument: ASDocument || null,
      sent: sent || false,
      items: items || null,
      fromCompanyId: fromCompanyId ? parseInt(fromCompanyId) : null,
      fromContactId: fromContactId ? parseInt(fromContactId) : null,
      toCompanyId: toCompanyId ? parseInt(toCompanyId) : null,
      toContactId: toContactId ? parseInt(toContactId) : null,
      currencyId: currencyId ? parseInt(currencyId) : null,
      emailTemplateId: emailTemplateId ? parseInt(emailTemplateId) : null,
      createdById: userId || null,
    };

    const newInvoice = await prisma.invoice.create({
      data: invoiceData,
      include: {
        fromCompany: true,
        fromContact: true,
        toCompany: true,
        toContact: true,
        currency: true,
        emailTemplate: true,
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
      message: 'Invoice created successfully',
      invoice: newInvoice,
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update an invoice
const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id);
    const {
      invoiceNumber,
      date,
      subtotal,
      taxRate,
      taxAmount,
      total,
      isTemplate,
      templateName,
      name,
      description,
      hasASDocument,
      ASDocument,
      sent,
      items,
      fromCompanyId,
      fromContactId,
      toCompanyId,
      toContactId,
      currencyId,
      emailTemplateId,
    } = req.body;

    if (isNaN(invoiceId)) {
      res.status(400).json({ error: 'Invalid invoice ID' });
      return;
    }

    const currentInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!currentInvoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const updateData = {};
    if (invoiceNumber !== undefined && invoiceNumber !== null) {
      updateData.invoiceNumber = parseInt(invoiceNumber);
    }
    if (date !== undefined) updateData.date = new Date(date);
    if (subtotal !== undefined) updateData.subtotal = parseFloat(subtotal);
    if (taxRate !== undefined) updateData.taxRate = parseFloat(taxRate);
    if (taxAmount !== undefined) updateData.taxAmount = parseFloat(taxAmount);
    if (total !== undefined) updateData.total = parseFloat(total);
    if (isTemplate !== undefined) updateData.isTemplate = isTemplate;
    if (templateName !== undefined) updateData.templateName = templateName || null;
    if (name !== undefined) updateData.name = name || null;
    if (description !== undefined) updateData.description = description || null;
    if (hasASDocument !== undefined) updateData.hasASDocument = hasASDocument;
    if (ASDocument !== undefined) updateData.ASDocument = ASDocument || null;
    if (sent !== undefined) updateData.sent = sent;
    if (items !== undefined) updateData.items = items || null;
    if (fromCompanyId !== undefined) updateData.fromCompanyId = fromCompanyId ? parseInt(fromCompanyId) : null;
    if (fromContactId !== undefined) updateData.fromContactId = fromContactId ? parseInt(fromContactId) : null;
    if (toCompanyId !== undefined) updateData.toCompanyId = toCompanyId ? parseInt(toCompanyId) : null;
    if (toContactId !== undefined) updateData.toContactId = toContactId ? parseInt(toContactId) : null;
    if (currencyId !== undefined) updateData.currencyId = currencyId ? parseInt(currencyId) : null;
    if (emailTemplateId !== undefined) updateData.emailTemplateId = emailTemplateId ? parseInt(emailTemplateId) : null;

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        fromCompany: true,
        fromContact: true,
        toCompany: true,
        toContact: true,
        currency: true,
        emailTemplate: true,
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
      message: 'Invoice updated successfully',
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete an invoice
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id);

    if (isNaN(invoiceId)) {
      res.status(400).json({ error: 'Invalid invoice ID' });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    await prisma.invoice.delete({
      where: { id: invoiceId },
    });

    res.status(200).json({
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark invoice as sent
const markInvoiceAsSent = async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id);

    if (isNaN(invoiceId)) {
      res.status(400).json({ error: 'Invalid invoice ID' });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { sent: true },
      include: {
        fromCompany: true,
        fromContact: true,
        toCompany: true,
        toContact: true,
        currency: true,
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
      message: 'Invoice marked as sent successfully',
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('Mark invoice as sent error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get latest invoice number for a company
const getLatestInvoiceNumber = async (req, res) => {
  try {
    const { toCompanyId } = req.params;
    const companyId = parseInt(toCompanyId);

    if (isNaN(companyId)) {
      res.status(400).json({ error: 'Invalid company ID' });
      return;
    }

    const latestInvoice = await prisma.invoice.findFirst({
      where: {
        toCompanyId: companyId,
        isTemplate: false, // Only count actual invoices, not templates
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
      select: {
        invoiceNumber: true,
      },
    });

    res.status(200).json({
      message: 'Latest invoice number retrieved successfully',
      latestInvoiceNumber: latestInvoice?.invoiceNumber || null,
    });
  } catch (error) {
    console.error('Get latest invoice number error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  markInvoiceAsSent,
  getLatestInvoiceNumber,
};

