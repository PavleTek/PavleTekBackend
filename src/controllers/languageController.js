const prisma = require('../lib/prisma');

// Get all languages
const getAllLanguages = async (req, res) => {
  try {
    const languages = await prisma.language.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      message: 'Languages retrieved successfully',
      languages: languages,
    });
  } catch (error) {
    console.error('Get all languages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new language
const createLanguage = async (req, res) => {
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

    const existingLanguage = await prisma.language.findUnique({
      where: { name: normalizedName },
    });

    if (existingLanguage) {
      res.status(409).json({ error: 'Language already exists' });
      return;
    }

    const newLanguage = await prisma.language.create({
      data: {
        name: normalizedName,
      },
    });

    res.status(201).json({
      message: 'Language created successfully',
      language: newLanguage,
    });
  } catch (error) {
    console.error('Create language error:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Language already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a language
const updateLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    const languageId = parseInt(id);
    const { name } = req.body;

    if (isNaN(languageId)) {
      res.status(400).json({ error: 'Invalid language ID' });
      return;
    }

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const currentLanguage = await prisma.language.findUnique({
      where: { id: languageId },
    });

    if (!currentLanguage) {
      res.status(404).json({ error: 'Language not found' });
      return;
    }

    const normalizedName = name.trim();

    if (!normalizedName) {
      res.status(400).json({ error: 'Name cannot be empty' });
      return;
    }

    const existingLanguage = await prisma.language.findUnique({
      where: { name: normalizedName },
    });

    if (existingLanguage && existingLanguage.id !== languageId) {
      res.status(409).json({ error: 'Language already exists' });
      return;
    }

    const updatedLanguage = await prisma.language.update({
      where: { id: languageId },
      data: { name: normalizedName },
    });

    res.status(200).json({
      message: 'Language updated successfully',
      language: updatedLanguage,
    });
  } catch (error) {
    console.error('Update language error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Language not found' });
      return;
    }
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Language already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a language
const deleteLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    const languageId = parseInt(id);

    if (isNaN(languageId)) {
      res.status(400).json({ error: 'Invalid language ID' });
      return;
    }

    const language = await prisma.language.findUnique({
      where: { id: languageId },
    });

    if (!language) {
      res.status(404).json({ error: 'Language not found' });
      return;
    }

    await prisma.language.delete({
      where: { id: languageId },
    });

    res.status(200).json({
      message: 'Language deleted successfully',
    });
  } catch (error) {
    console.error('Delete language error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Language not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllLanguages,
  createLanguage,
  updateLanguage,
  deleteLanguage,
};

