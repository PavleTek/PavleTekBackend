const prisma = require('../lib/prisma');

// Get all currencies
const getAllCurrencies = async (req, res) => {
  try {
    const currencies = await prisma.currency.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      message: 'Currencies retrieved successfully',
      currencies: currencies,
    });
  } catch (error) {
    console.error('Get all currencies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new currency
const createCurrency = async (req, res) => {
  try {
    const { name, abbreviation } = req.body;

    if (!name || !abbreviation) {
      res.status(400).json({ error: 'Name and abbreviation are required' });
      return;
    }

    const normalizedName = name.trim();
    const normalizedAbbreviation = abbreviation.trim().toUpperCase();

    if (!normalizedName || !normalizedAbbreviation) {
      res.status(400).json({ error: 'Name and abbreviation cannot be empty' });
      return;
    }

    const existingCurrency = await prisma.currency.findUnique({
      where: { abbreviation: normalizedAbbreviation },
    });

    if (existingCurrency) {
      res.status(409).json({ error: 'Currency with this abbreviation already exists' });
      return;
    }

    const newCurrency = await prisma.currency.create({
      data: {
        name: normalizedName,
        abbreviation: normalizedAbbreviation,
      },
    });

    res.status(201).json({
      message: 'Currency created successfully',
      currency: newCurrency,
    });
  } catch (error) {
    console.error('Create currency error:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Currency with this abbreviation already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a currency
const updateCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    const currencyId = parseInt(id);
    const { name, abbreviation } = req.body;

    if (isNaN(currencyId)) {
      res.status(400).json({ error: 'Invalid currency ID' });
      return;
    }

    const currentCurrency = await prisma.currency.findUnique({
      where: { id: currencyId },
    });

    if (!currentCurrency) {
      res.status(404).json({ error: 'Currency not found' });
      return;
    }

    const updateData = {};
    if (name !== undefined) {
      const normalizedName = name.trim();
      if (!normalizedName) {
        res.status(400).json({ error: 'Name cannot be empty' });
        return;
      }
      updateData.name = normalizedName;
    }

    if (abbreviation !== undefined) {
      const normalizedAbbreviation = abbreviation.trim().toUpperCase();
      if (!normalizedAbbreviation) {
        res.status(400).json({ error: 'Abbreviation cannot be empty' });
        return;
      }

      const existingCurrency = await prisma.currency.findUnique({
        where: { abbreviation: normalizedAbbreviation },
      });

      if (existingCurrency && existingCurrency.id !== currencyId) {
        res.status(409).json({ error: 'Currency with this abbreviation already exists' });
        return;
      }

      updateData.abbreviation = normalizedAbbreviation;
    }

    const updatedCurrency = await prisma.currency.update({
      where: { id: currencyId },
      data: updateData,
    });

    res.status(200).json({
      message: 'Currency updated successfully',
      currency: updatedCurrency,
    });
  } catch (error) {
    console.error('Update currency error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Currency not found' });
      return;
    }
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Currency with this abbreviation already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a currency
const deleteCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    const currencyId = parseInt(id);

    if (isNaN(currencyId)) {
      res.status(400).json({ error: 'Invalid currency ID' });
      return;
    }

    const currency = await prisma.currency.findUnique({
      where: { id: currencyId },
    });

    if (!currency) {
      res.status(404).json({ error: 'Currency not found' });
      return;
    }

    await prisma.currency.delete({
      where: { id: currencyId },
    });

    res.status(200).json({
      message: 'Currency deleted successfully',
    });
  } catch (error) {
    console.error('Delete currency error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Currency not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllCurrencies,
  createCurrency,
  updateCurrency,
  deleteCurrency,
};

