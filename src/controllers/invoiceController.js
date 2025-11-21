const prisma = require('../lib/prisma');

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
      message: 'Invoices retrieved successfully',
      invoices: invoices,
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

    res.status(200).json({
      message: 'Invoice retrieved successfully',
      invoice: invoice,
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
      sent,
      items,
      fromCompanyId,
      fromContactId,
      toCompanyId,
      toContactId,
      currencyId,
    } = req.body;

    const userId = req.user?.id;

    // Validate required fields
    if (invoiceNumber === undefined || date === undefined || subtotal === undefined || taxRate === undefined || taxAmount === undefined || total === undefined) {
      res.status(400).json({ error: 'Invoice number, date, subtotal, taxRate, taxAmount, and total are required' });
      return;
    }

    // Check if invoice number already exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { invoiceNumber: parseInt(invoiceNumber) },
    });

    if (existingInvoice) {
      res.status(409).json({ error: 'Invoice with this number already exists' });
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
      sent: sent || false,
      items: items || null,
      fromCompanyId: fromCompanyId ? parseInt(fromCompanyId) : null,
      fromContactId: fromContactId ? parseInt(fromContactId) : null,
      toCompanyId: toCompanyId ? parseInt(toCompanyId) : null,
      toContactId: toContactId ? parseInt(toContactId) : null,
      currencyId: currencyId ? parseInt(currencyId) : null,
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
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Invoice with this number already exists' });
      return;
    }
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
      sent,
      items,
      fromCompanyId,
      fromContactId,
      toCompanyId,
      toContactId,
      currencyId,
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
    if (invoiceNumber !== undefined) {
      const newInvoiceNumber = parseInt(invoiceNumber);
      // Check if invoice number already exists (excluding current invoice)
      const existingInvoice = await prisma.invoice.findUnique({
        where: { invoiceNumber: newInvoiceNumber },
      });
      if (existingInvoice && existingInvoice.id !== invoiceId) {
        res.status(409).json({ error: 'Invoice with this number already exists' });
        return;
      }
      updateData.invoiceNumber = newInvoiceNumber;
    }
    if (date !== undefined) updateData.date = new Date(date);
    if (subtotal !== undefined) updateData.subtotal = parseFloat(subtotal);
    if (taxRate !== undefined) updateData.taxRate = parseFloat(taxRate);
    if (taxAmount !== undefined) updateData.taxAmount = parseFloat(taxAmount);
    if (total !== undefined) updateData.total = parseFloat(total);
    if (isTemplate !== undefined) updateData.isTemplate = isTemplate;
    if (templateName !== undefined) updateData.templateName = templateName || null;
    if (sent !== undefined) updateData.sent = sent;
    if (items !== undefined) updateData.items = items || null;
    if (fromCompanyId !== undefined) updateData.fromCompanyId = fromCompanyId ? parseInt(fromCompanyId) : null;
    if (fromContactId !== undefined) updateData.fromContactId = fromContactId ? parseInt(fromContactId) : null;
    if (toCompanyId !== undefined) updateData.toCompanyId = toCompanyId ? parseInt(toCompanyId) : null;
    if (toContactId !== undefined) updateData.toContactId = toContactId ? parseInt(toContactId) : null;
    if (currencyId !== undefined) updateData.currencyId = currencyId ? parseInt(currencyId) : null;

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
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
      message: 'Invoice updated successfully',
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Invoice with this number already exists' });
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

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  markInvoiceAsSent,
};

