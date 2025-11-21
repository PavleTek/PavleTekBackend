const prisma = require('../lib/prisma');

// Get all companies
const getAllCompanies = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        currency: true,
        defaultContact: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
            lastName: true,
          },
        },
        associatedContacts: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      message: 'Companies retrieved successfully',
      companies: companies,
    });
  } catch (error) {
    console.error('Get all companies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a specific company by ID
const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = parseInt(id);

    if (isNaN(companyId)) {
      res.status(400).json({ error: 'Invalid company ID' });
      return;
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        currency: true,
        defaultContact: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
            lastName: true,
          },
        },
        associatedContacts: true,
        bankAccounts: true,
      },
    });

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    res.status(200).json({
      message: 'Company retrieved successfully',
      company: company,
    });
  } catch (error) {
    console.error('Get company by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new company
const createCompany = async (req, res) => {
  try {
    const {
      displayName,
      legalName,
      taxId,
      website,
      businessType,
      color,
      address,
      country,
      language,
      currencyId,
      defaultContactId,
    } = req.body;

    const userId = req.user?.id;

    const companyData = {
      displayName: displayName || null,
      legalName: legalName || null,
      taxId: taxId || null,
      website: website || null,
      businessType: businessType || null,
      color: color || '#7ad9c5',
      address: address || null,
      country: country || null,
      language: language || null,
      currencyId: currencyId ? parseInt(currencyId) : null,
      defaultContactId: defaultContactId ? parseInt(defaultContactId) : null,
      createdById: userId || null,
    };

    const newCompany = await prisma.company.create({
      data: companyData,
      include: {
        currency: true,
        defaultContact: true,
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
      message: 'Company created successfully',
      company: newCompany,
    });
  } catch (error) {
    console.error('Create company error:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Company already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a company
const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = parseInt(id);
    const {
      displayName,
      legalName,
      taxId,
      website,
      businessType,
      color,
      address,
      country,
      language,
      currencyId,
      defaultContactId,
    } = req.body;

    if (isNaN(companyId)) {
      res.status(400).json({ error: 'Invalid company ID' });
      return;
    }

    const currentCompany = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!currentCompany) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName || null;
    if (legalName !== undefined) updateData.legalName = legalName || null;
    if (taxId !== undefined) updateData.taxId = taxId || null;
    if (website !== undefined) updateData.website = website || null;
    if (businessType !== undefined) updateData.businessType = businessType || null;
    if (color !== undefined) updateData.color = color || '#7ad9c5';
    if (address !== undefined) updateData.address = address || null;
    if (country !== undefined) updateData.country = country || null;
    if (language !== undefined) updateData.language = language || null;
    if (currencyId !== undefined) updateData.currencyId = currencyId ? parseInt(currencyId) : null;
    if (defaultContactId !== undefined) updateData.defaultContactId = defaultContactId ? parseInt(defaultContactId) : null;

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: updateData,
      include: {
        currency: true,
        defaultContact: true,
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
      message: 'Company updated successfully',
      company: updatedCompany,
    });
  } catch (error) {
    console.error('Update company error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a company
const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = parseInt(id);

    if (isNaN(companyId)) {
      res.status(400).json({ error: 'Invalid company ID' });
      return;
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    await prisma.company.delete({
      where: { id: companyId },
    });

    res.status(200).json({
      message: 'Company deleted successfully',
    });
  } catch (error) {
    console.error('Delete company error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
};

