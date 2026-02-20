const prisma = require('../lib/prisma');
const r2Service = require('../services/r2Service');
const { sendEmail } = require('../services/emailService');

// Replace date variables in template strings (${date}, ${englishMonth}, ${spanishMonth}, ${year})
function replaceDateVariables(template, dateStr) {
  if (!template) return '';
  if (!dateStr) return template;
  let dateObj;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    dateObj = new Date(y, m - 1, d);
  } else {
    dateObj = new Date(dateStr);
  }
  if (isNaN(dateObj.getTime())) return template;
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const year = dateObj.getFullYear();
  const formattedDate = `${month}/${day}/${year}`;
  const englishMonth = dateObj.toLocaleString('en-US', { month: 'long' });
  const spanishMonthLower = dateObj.toLocaleString('es-ES', { month: 'long' });
  const spanishMonth = spanishMonthLower.charAt(0).toUpperCase() + spanishMonthLower.slice(1);
  return template
    .replace(/\$\{date\}/g, formattedDate)
    .replace(/\$\{englishMonth\}/g, englishMonth)
    .replace(/\$\{spanishMonth\}/g, spanishMonth)
    .replace(/\$\{year\}/g, String(year));
}

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

// Delete an invoice (and any R2 documents)
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

    // Delete R2 files if they exist
    const keysToDelete = [invoice.invoicePdfR2Key, invoice.asPdfR2Key].filter(Boolean);
    for (const key of keysToDelete) {
      try {
        await r2Service.deleteFile(key);
      } catch (err) {
        console.warn('R2 delete warning when deleting invoice:', key, err.message);
      }
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

// Upload invoice and/or AS PDFs to R2
const uploadDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id);

    if (isNaN(invoiceId)) {
      res.status(400).json({ error: 'Invalid invoice ID' });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { fromCompany: true, toCompany: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (invoice.isTemplate) {
      res.status(400).json({ error: 'Cannot upload documents for a template' });
      return;
    }

    const invoicePdfFile = req.files?.invoicePdf?.[0];
    const asPdfFile = req.files?.asPdf?.[0];

    if (!invoicePdfFile && !asPdfFile) {
      res.status(400).json({ error: 'At least one PDF is required (invoicePdf or asPdf)' });
      return;
    }

    const fromName = (invoice.fromCompany?.displayName || invoice.fromCompany?.legalName || 'From').replace(/[^a-zA-Z0-9-_]/g, '_');
    const toName = (invoice.toCompany?.displayName || invoice.toCompany?.legalName || 'To').replace(/[^a-zA-Z0-9-_]/g, '_');
    const dateStr = invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const prefix = `invoices/${invoiceId}`;

    const updates = { documentsGeneratedAt: new Date() };

    if (invoicePdfFile && invoicePdfFile.mimetype === 'application/pdf') {
      const invoiceKey = `${prefix}/Invoice_${fromName}_${toName}_N${invoice.invoiceNumber}_${dateStr}.pdf`;
      await r2Service.uploadFile(invoiceKey, invoicePdfFile.buffer, 'application/pdf');
      updates.invoicePdfR2Key = invoiceKey;
    }

    if (asPdfFile && asPdfFile.mimetype === 'application/pdf') {
      const asKey = `${prefix}/AS_${fromName}_${toName}_${dateStr}.pdf`;
      await r2Service.uploadFile(asKey, asPdfFile.buffer, 'application/pdf');
      updates.asPdfR2Key = asKey;
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updates,
      include: {
        fromCompany: true,
        fromContact: true,
        toCompany: true,
        toContact: true,
        currency: true,
        emailTemplate: true,
        createdBy: { select: { id: true, username: true, name: true, lastName: true } },
      },
    });

    res.status(200).json({
      message: 'Documents uploaded successfully',
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('Upload documents error:', error);
    if (error.message && error.message.includes('R2')) {
      res.status(503).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a stored document (invoice or as) for preview/download
const getDocument = async (req, res) => {
  try {
    const { id, type } = req.params;
    const invoiceId = parseInt(id);

    if (isNaN(invoiceId)) {
      res.status(400).json({ error: 'Invalid invoice ID' });
      return;
    }

    if (type !== 'invoice' && type !== 'as') {
      res.status(400).json({ error: 'Invalid document type. Use "invoice" or "as".' });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const key = type === 'invoice' ? invoice.invoicePdfR2Key : invoice.asPdfR2Key;
    if (!key) {
      res.status(404).json({ error: `No stored ${type} document found for this invoice` });
      return;
    }

    const buffer = await r2Service.getFile(key);
    const filename = key.split('/').pop() || `${type}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Get document error:', error);
    if (error.message && error.message.includes('R2')) {
      res.status(503).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete stored documents from R2 and clear keys on invoice
const deleteDocuments = async (req, res) => {
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

    const keysToDelete = [invoice.invoicePdfR2Key, invoice.asPdfR2Key].filter(Boolean);
    for (const key of keysToDelete) {
      try {
        await r2Service.deleteFile(key);
      } catch (err) {
        console.warn('R2 delete warning (may already be missing):', key, err.message);
      }
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        invoicePdfR2Key: null,
        asPdfR2Key: null,
        documentsGeneratedAt: null,
      },
    });

    res.status(200).json({ message: 'Documents deleted successfully' });
  } catch (error) {
    console.error('Delete documents error:', error);
    if (error.message && error.message.includes('R2')) {
      res.status(503).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send email using stored R2 documents as attachments
const sendInvoiceEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id);
    const { fromEmail, toEmails, ccEmails, bccEmails, subject, content } = req.body;

    if (isNaN(invoiceId)) {
      res.status(400).json({ error: 'Invalid invoice ID' });
      return;
    }

    if (!fromEmail || !toEmails || !subject || !content) {
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
          return emails.split(',').map((e) => e.trim()).filter(Boolean);
        }
      }
      return [];
    };

    const toList = parseEmailArray(toEmails);
    const ccList = parseEmailArray(ccEmails);
    const bccList = parseEmailArray(bccEmails);

    if (toList.length === 0) {
      res.status(400).json({ error: 'At least one recipient email is required' });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        emailTemplate: {
          include: {
            contacts: { include: { contact: { select: { id: true, email: true, firstName: true, lastName: true } } } },
          },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (!invoice.invoicePdfR2Key && !invoice.asPdfR2Key) {
      res.status(400).json({ error: 'No stored documents for this invoice. Generate and save documents first.' });
      return;
    }

    const attachments = [];
    if (invoice.invoicePdfR2Key) {
      const buf = await r2Service.getFile(invoice.invoicePdfR2Key);
      const filename = invoice.invoicePdfR2Key.split('/').pop() || 'invoice.pdf';
      attachments.push({ filename, content: buf, contentType: 'application/pdf' });
    }
    if (invoice.asPdfR2Key) {
      const buf = await r2Service.getFile(invoice.asPdfR2Key);
      const filename = invoice.asPdfR2Key.split('/').pop() || 'as.pdf';
      attachments.push({ filename, content: buf, contentType: 'application/pdf' });
    }

    const invoiceDateStr = invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : '';
    const finalSubject = replaceDateVariables(subject, invoiceDateStr);
    const finalContent = replaceDateVariables(content, invoiceDateStr);

    const result = await sendEmail({
      fromEmail: fromEmail.trim().toLowerCase(),
      toEmails: toList.map((e) => e.trim().toLowerCase()),
      ccEmails: ccList.length > 0 ? ccList.map((e) => e.trim().toLowerCase()) : undefined,
      bccEmails: bccList.length > 0 ? bccList.map((e) => e.trim().toLowerCase()) : undefined,
      subject: finalSubject,
      content: finalContent,
      isHtml: false,
      attachments,
    });

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { sent: true },
    });

    res.status(200).json({
      message: 'Email sent successfully',
      messageId: result?.data?.id || 'sent',
    });
  } catch (error) {
    console.error('Send invoice email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
};

// Schedule an invoice to be sent at a future time (UTC)
const scheduleSend = async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id);
    const {
      scheduledSendAt,
      fromEmail,
      toEmails,
      ccEmails,
      bccEmails,
      subject,
      content,
    } = req.body;

    if (isNaN(invoiceId)) {
      res.status(400).json({ error: 'Invalid invoice ID' });
      return;
    }

    if (!scheduledSendAt || !fromEmail || !toEmails || !subject || !content) {
      res.status(400).json({
        error:
          'scheduledSendAt, fromEmail, toEmails, subject, and content are required',
      });
      return;
    }

    const sendAt = new Date(scheduledSendAt);
    if (isNaN(sendAt.getTime()) || sendAt <= new Date()) {
      res.status(400).json({
        error: 'scheduledSendAt must be a valid future date/time (UTC)',
      });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (invoice.isTemplate) {
      res.status(400).json({ error: 'Cannot schedule send for a template' });
      return;
    }

    if (!invoice.invoicePdfR2Key && !invoice.asPdfR2Key) {
      res.status(400).json({
        error:
          'No stored documents for this invoice. Generate and save documents first.',
      });
      return;
    }

    const scheduledEmailData = {
      fromEmail: fromEmail.trim().toLowerCase(),
      toEmails: Array.isArray(toEmails) ? toEmails : [toEmails],
      ccEmails: ccEmails != null ? (Array.isArray(ccEmails) ? ccEmails : [ccEmails]) : [],
      bccEmails: bccEmails != null ? (Array.isArray(bccEmails) ? bccEmails : [bccEmails]) : [],
      subject: String(subject),
      content: String(content),
    };

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        scheduledSendAt: sendAt,
        scheduledStatus: 'pending',
        scheduledEmailData,
        scheduledSentAt: null,
        scheduledError: null,
      },
      include: {
        fromCompany: true,
        fromContact: true,
        toCompany: true,
        toContact: true,
        currency: true,
        emailTemplate: true,
        createdBy: {
          select: { id: true, username: true, name: true, lastName: true },
        },
      },
    });

    res.status(200).json({
      message: 'Invoice scheduled for send successfully',
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('Schedule send error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Cancel a pending scheduled send
const cancelSchedule = async (req, res) => {
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

    if (invoice.scheduledStatus !== 'pending') {
      res.status(400).json({
        error: 'No pending schedule to cancel. Only pending schedules can be cancelled.',
      });
      return;
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        scheduledStatus: 'cancelled',
        scheduledSendAt: null,
        scheduledEmailData: null,
        scheduledError: null,
      },
      include: {
        fromCompany: true,
        fromContact: true,
        toCompany: true,
        toContact: true,
        currency: true,
        emailTemplate: true,
        createdBy: {
          select: { id: true, username: true, name: true, lastName: true },
        },
      },
    });

    res.status(200).json({
      message: 'Scheduled send cancelled successfully',
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('Cancel schedule error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
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
  uploadDocuments,
  getDocument,
  deleteDocuments,
  sendInvoiceEmail,
  scheduleSend,
  cancelSchedule,
};

