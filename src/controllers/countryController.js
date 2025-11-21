const prisma = require('../lib/prisma');

// Get all countries
const getAllCountries = async (req, res) => {
  try {
    const countries = await prisma.country.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      message: 'Countries retrieved successfully',
      countries: countries,
    });
  } catch (error) {
    console.error('Get all countries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new country
const createCountry = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const normalizedName = name.trim();

    if (!normalizedName) {
      res.status(400).json({ error: 'Name cannot be empty' });
      return;
    }

    const existingCountry = await prisma.country.findUnique({
      where: { name: normalizedName },
    });

    if (existingCountry) {
      res.status(409).json({ error: 'Country already exists' });
      return;
    }

    const newCountry = await prisma.country.create({
      data: {
        name: normalizedName,
      },
    });

    res.status(201).json({
      message: 'Country created successfully',
      country: newCountry,
    });
  } catch (error) {
    console.error('Create country error:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Country already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a country
const updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const countryId = parseInt(id);
    const { name } = req.body;

    if (isNaN(countryId)) {
      res.status(400).json({ error: 'Invalid country ID' });
      return;
    }

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const currentCountry = await prisma.country.findUnique({
      where: { id: countryId },
    });

    if (!currentCountry) {
      res.status(404).json({ error: 'Country not found' });
      return;
    }

    const normalizedName = name.trim();

    if (!normalizedName) {
      res.status(400).json({ error: 'Name cannot be empty' });
      return;
    }

    const existingCountry = await prisma.country.findUnique({
      where: { name: normalizedName },
    });

    if (existingCountry && existingCountry.id !== countryId) {
      res.status(409).json({ error: 'Country already exists' });
      return;
    }

    const updatedCountry = await prisma.country.update({
      where: { id: countryId },
      data: { name: normalizedName },
    });

    res.status(200).json({
      message: 'Country updated successfully',
      country: updatedCountry,
    });
  } catch (error) {
    console.error('Update country error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Country not found' });
      return;
    }
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Country already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a country
const deleteCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const countryId = parseInt(id);

    if (isNaN(countryId)) {
      res.status(400).json({ error: 'Invalid country ID' });
      return;
    }

    const country = await prisma.country.findUnique({
      where: { id: countryId },
    });

    if (!country) {
      res.status(404).json({ error: 'Country not found' });
      return;
    }

    await prisma.country.delete({
      where: { id: countryId },
    });

    res.status(200).json({
      message: 'Country deleted successfully',
    });
  } catch (error) {
    console.error('Delete country error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Country not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllCountries,
  createCountry,
  updateCountry,
  deleteCountry,
};

