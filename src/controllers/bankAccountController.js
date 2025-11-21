const prisma = require('../lib/prisma');

// Get all bank accounts
const getAllBankAccounts = async (req, res) => {
  try {
    const bankAccounts = await prisma.bankAccount.findMany({
      include: {
        currency: true,
        ownerContact: true,
        ownerCompany: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      message: 'Bank accounts retrieved successfully',
      bankAccounts: bankAccounts,
    });
  } catch (error) {
    console.error('Get all bank accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a specific bank account by ID
const getBankAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const bankAccountId = parseInt(id);

    if (isNaN(bankAccountId)) {
      res.status(400).json({ error: 'Invalid bank account ID' });
      return;
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      include: {
        currency: true,
        ownerContact: true,
        ownerCompany: true,
      },
    });

    if (!bankAccount) {
      res.status(404).json({ error: 'Bank account not found' });
      return;
    }

    res.status(200).json({
      message: 'Bank account retrieved successfully',
      bankAccount: bankAccount,
    });
  } catch (error) {
    console.error('Get bank account by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new bank account
const createBankAccount = async (req, res) => {
  try {
    const {
      bankName,
      accountHolder,
      accountNumber,
      accountType,
      swiftCode,
      ibanCode,
      routingNumber,
      bankCode,
      branchName,
      email,
      notes,
      currencyId,
      country,
      ownerContactId,
      ownerCompanyId,
    } = req.body;

    const bankAccountData = {
      bankName: bankName || null,
      accountHolder: accountHolder || null,
      accountNumber: accountNumber || null,
      accountType: accountType || null,
      swiftCode: swiftCode || null,
      ibanCode: ibanCode || null,
      routingNumber: routingNumber || null,
      bankCode: bankCode || null,
      branchName: branchName || null,
      email: email || null,
      notes: notes || null,
      currencyId: currencyId ? parseInt(currencyId) : null,
      country: country || null,
      ownerContactId: ownerContactId ? parseInt(ownerContactId) : null,
      ownerCompanyId: ownerCompanyId ? parseInt(ownerCompanyId) : null,
    };

    const newBankAccount = await prisma.bankAccount.create({
      data: bankAccountData,
      include: {
        currency: true,
        ownerContact: true,
        ownerCompany: true,
      },
    });

    res.status(201).json({
      message: 'Bank account created successfully',
      bankAccount: newBankAccount,
    });
  } catch (error) {
    console.error('Create bank account error:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Bank account already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a bank account
const updateBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const bankAccountId = parseInt(id);
    const {
      bankName,
      accountHolder,
      accountNumber,
      accountType,
      swiftCode,
      ibanCode,
      routingNumber,
      bankCode,
      branchName,
      email,
      notes,
      currencyId,
      country,
      ownerContactId,
      ownerCompanyId,
    } = req.body;

    if (isNaN(bankAccountId)) {
      res.status(400).json({ error: 'Invalid bank account ID' });
      return;
    }

    const currentBankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!currentBankAccount) {
      res.status(404).json({ error: 'Bank account not found' });
      return;
    }

    const updateData = {};
    if (bankName !== undefined) updateData.bankName = bankName || null;
    if (accountHolder !== undefined) updateData.accountHolder = accountHolder || null;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber || null;
    if (accountType !== undefined) updateData.accountType = accountType || null;
    if (swiftCode !== undefined) updateData.swiftCode = swiftCode || null;
    if (ibanCode !== undefined) updateData.ibanCode = ibanCode || null;
    if (routingNumber !== undefined) updateData.routingNumber = routingNumber || null;
    if (bankCode !== undefined) updateData.bankCode = bankCode || null;
    if (branchName !== undefined) updateData.branchName = branchName || null;
    if (email !== undefined) updateData.email = email || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (currencyId !== undefined) updateData.currencyId = currencyId ? parseInt(currencyId) : null;
    if (country !== undefined) updateData.country = country || null;
    if (ownerContactId !== undefined) updateData.ownerContactId = ownerContactId ? parseInt(ownerContactId) : null;
    if (ownerCompanyId !== undefined) updateData.ownerCompanyId = ownerCompanyId ? parseInt(ownerCompanyId) : null;

    const updatedBankAccount = await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: updateData,
      include: {
        currency: true,
        ownerContact: true,
        ownerCompany: true,
      },
    });

    res.status(200).json({
      message: 'Bank account updated successfully',
      bankAccount: updatedBankAccount,
    });
  } catch (error) {
    console.error('Update bank account error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Bank account not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a bank account
const deleteBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const bankAccountId = parseInt(id);

    if (isNaN(bankAccountId)) {
      res.status(400).json({ error: 'Invalid bank account ID' });
      return;
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount) {
      res.status(404).json({ error: 'Bank account not found' });
      return;
    }

    await prisma.bankAccount.delete({
      where: { id: bankAccountId },
    });

    res.status(200).json({
      message: 'Bank account deleted successfully',
    });
  } catch (error) {
    console.error('Delete bank account error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Bank account not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllBankAccounts,
  getBankAccountById,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
};

