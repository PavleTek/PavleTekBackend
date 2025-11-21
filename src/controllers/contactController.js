const prisma = require('../lib/prisma');

// Get all contacts
const getAllContacts = async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      include: {
        currency: true,
        associatedCompany: true,
        defaultBankAccount: true,
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
      message: 'Contacts retrieved successfully',
      contacts: contacts,
    });
  } catch (error) {
    console.error('Get all contacts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a specific contact by ID
const getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    const contactId = parseInt(id);

    if (isNaN(contactId)) {
      res.status(400).json({ error: 'Invalid contact ID' });
      return;
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        currency: true,
        associatedCompany: true,
        defaultBankAccount: true,
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

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.status(200).json({
      message: 'Contact retrieved successfully',
      contact: contact,
    });
  } catch (error) {
    console.error('Get contact by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new contact
const createContact = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      chileanRutNumber,
      phoneNumber,
      email,
      color,
      notes,
      taxID,
      roleInCompany,
      address,
      countryId,
      languageId,
      currencyId,
      associatedCompanyId,
      defaultBankAccountId,
    } = req.body;

    const userId = req.user?.id;

    // Look up country and language names from IDs if provided
    let countryName = null;
    let languageName = null;

    if (countryId !== undefined && countryId !== null && countryId !== '') {
      const countryIdInt = parseInt(countryId);
      if (!isNaN(countryIdInt) && countryIdInt > 0) {
        try {
          const countryRecord = await prisma.country.findUnique({
            where: { id: countryIdInt },
          });
          if (countryRecord) {
            countryName = countryRecord.name;
          }
        } catch (err) {
          console.error('Error looking up country:', err);
        }
      }
    }

    if (languageId !== undefined && languageId !== null && languageId !== '') {
      const languageIdInt = parseInt(languageId);
      if (!isNaN(languageIdInt) && languageIdInt > 0) {
        try {
          const languageRecord = await prisma.language.findUnique({
            where: { id: languageIdInt },
          });
          if (languageRecord) {
            languageName = languageRecord.name;
          }
        } catch (err) {
          console.error('Error looking up language:', err);
        }
      }
    }

    const contactData = {
      firstName: firstName || null,
      lastName: lastName || null,
      chileanRutNumber: chileanRutNumber || null,
      phoneNumber: phoneNumber || null,
      email: email || null,
      color: color || '#7ad9c5',
      notes: notes || null,
      taxID: taxID || null,
      roleInCompany: roleInCompany || null,
      address: address || null,
      country: countryName,
      language: languageName,
      currencyId: currencyId ? parseInt(currencyId) : null,
      associatedCompanyId: associatedCompanyId ? parseInt(associatedCompanyId) : null,
      defaultBankAccountId: defaultBankAccountId ? parseInt(defaultBankAccountId) : null,
      createdById: userId || null,
    };

    const newContact = await prisma.contact.create({
      data: contactData,
      include: {
        currency: true,
        associatedCompany: true,
        defaultBankAccount: true,
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
      message: 'Contact created successfully',
      contact: newContact,
    });
  } catch (error) {
    console.error('Create contact error:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Contact already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a contact
const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contactId = parseInt(id);
    const {
      firstName,
      lastName,
      chileanRutNumber,
      phoneNumber,
      email,
      color,
      notes,
      taxID,
      roleInCompany,
      address,
      countryId,
      languageId,
      currencyId,
      associatedCompanyId,
      defaultBankAccountId,
    } = req.body;

    if (isNaN(contactId)) {
      res.status(400).json({ error: 'Invalid contact ID' });
      return;
    }

    const currentContact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!currentContact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName || null;
    if (lastName !== undefined) updateData.lastName = lastName || null;
    if (chileanRutNumber !== undefined) updateData.chileanRutNumber = chileanRutNumber || null;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber || null;
    if (email !== undefined) updateData.email = email || null;
    if (color !== undefined) updateData.color = color || '#7ad9c5';
    if (notes !== undefined) updateData.notes = notes || null;
    if (taxID !== undefined) updateData.taxID = taxID || null;
    if (roleInCompany !== undefined) updateData.roleInCompany = roleInCompany || null;
    if (address !== undefined) updateData.address = address || null;
    
    // Handle countryId - look up the country name
    if (countryId !== undefined) {
      if (countryId) {
        const countryIdInt = parseInt(countryId);
        if (!isNaN(countryIdInt)) {
          const country = await prisma.country.findUnique({
            where: { id: countryIdInt },
          });
          updateData.country = country ? country.name : null;
        } else {
          updateData.country = null;
        }
      } else {
        updateData.country = null;
      }
    }
    
    // Handle languageId - look up the language name
    if (languageId !== undefined) {
      if (languageId) {
        const languageIdInt = parseInt(languageId);
        if (!isNaN(languageIdInt)) {
          const language = await prisma.language.findUnique({
            where: { id: languageIdInt },
          });
          updateData.language = language ? language.name : null;
        } else {
          updateData.language = null;
        }
      } else {
        updateData.language = null;
      }
    }
    
    if (currencyId !== undefined) updateData.currencyId = currencyId ? parseInt(currencyId) : null;
    if (associatedCompanyId !== undefined) updateData.associatedCompanyId = associatedCompanyId ? parseInt(associatedCompanyId) : null;
    if (defaultBankAccountId !== undefined) updateData.defaultBankAccountId = defaultBankAccountId ? parseInt(defaultBankAccountId) : null;

    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: updateData,
      include: {
        currency: true,
        associatedCompany: true,
        defaultBankAccount: true,
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
      message: 'Contact updated successfully',
      contact: updatedContact,
    });
  } catch (error) {
    console.error('Update contact error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a contact
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contactId = parseInt(id);

    if (isNaN(contactId)) {
      res.status(400).json({ error: 'Invalid contact ID' });
      return;
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    await prisma.contact.delete({
      where: { id: contactId },
    });

    res.status(200).json({
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
};

