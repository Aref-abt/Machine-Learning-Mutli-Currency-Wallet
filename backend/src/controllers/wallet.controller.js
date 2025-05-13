import { logger } from '../utils/logger.js';
import { sequelize } from '../database/db.js';
import { Wallet, Transaction } from '../models/index.js';

export const createWallet = async (req, res) => {
  const { currency } = req.body;
  logger.info('Creating wallet:', { userId: req.user?.id, currency });

  try {
    if (!currency) {
      return res.status(400).json({ message: 'Currency is required' });
    }

    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY'];
    if (!supportedCurrencies.includes(currency)) {
      return res.status(400).json({ message: `Invalid currency. Supported currencies: ${supportedCurrencies.join(', ')}` });
    }

    // Check if user already has a wallet in this currency
    const existingWallet = await Wallet.findOne({
      where: { userId: req.user.id, currency }
    });

    if (existingWallet) {
      return res.status(400).json({ message: `You already have a ${currency} wallet` });
    }

    logger.info('Creating wallet in database...');
    // Create new wallet
    const wallet = await Wallet.create({
      userId: req.user.id,
      currency,
      balance: 0
    });
    logger.info('Wallet created successfully:', { walletId: wallet.id });

    res.status(201).json({ wallet });
  } catch (error) {
    logger.error('Error creating wallet:', error);
    logger.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Failed to create wallet. Please try again.' });
  }
};

export const getWallets = async (req, res) => {
  try {
    logger.info('Fetching wallets for user:', { userId: req.user?.id });
    
    if (!req.user?.id) {
      logger.error('No user ID found in request');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get wallets without transactions first
    const wallets = await Wallet.findAll({
      raw: true,
      where: { userId: req.user.id }
    });

    // Map wallets to include empty transactions array
    const walletsWithTransactions = wallets.map(wallet => ({
      ...wallet,
      transactions: []
    }));

    // Get transactions for each wallet
    for (const wallet of walletsWithTransactions) {
      try {
        const transactions = await Transaction.findAll({
          raw: true,
          where: { walletId: wallet.id },
          limit: 5,
          order: [['createdAt', 'DESC']]
        });
        wallet.transactions = transactions;
      } catch (error) {
        logger.error('Error fetching transactions for wallet:', { walletId: wallet.id, error });
        // Continue with empty transactions array
      }
    }

    logger.info('Successfully fetched wallets:', { count: walletsWithTransactions.length });
    res.json({ wallets: walletsWithTransactions });
  } catch (error) {
    logger.error('Error fetching wallets:', error);
    logger.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Error fetching wallets' });
  }
};

export const getTransactions = async (req, res) => {
  const { walletId } = req.params;

  try {
    const transactions = await Transaction.findAll({
      where: { walletId },
      order: [['createdAt', 'DESC']]
    });

    res.json({ transactions });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
};

export const createTransaction = async (req, res) => {
  const { walletId, type, amount, currency } = req.body;

  try {
    // Validate required fields
    if (!walletId || !type || !amount || !currency) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Verify wallet ownership
    const wallet = await Wallet.findOne({
      where: { id: walletId, userId: req.user.id }
    });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found or unauthorized' });
    }

    // Verify currency matches
    if (wallet.currency !== currency) {
      return res.status(400).json({ message: 'Currency mismatch with wallet' });
    }

    // Calculate new balance
    let newBalance = parseFloat(wallet.balance);
    if (type === 'deposit') {
      newBalance += parsedAmount;
    } else if (type === 'withdrawal') {
      if (newBalance < parsedAmount) {
        return res.status(400).json({ message: 'Insufficient funds' });
      }
      newBalance -= parsedAmount;
    } else {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }

    // Use Sequelize transaction
    const result = await sequelize.transaction(async (t) => {
      // Update wallet balance
      await wallet.update({ balance: newBalance }, { transaction: t });

      // Create transaction record
      const transaction = await Transaction.create({
        userId: req.user.id,
        walletId,
        type,
        amount: parsedAmount,
        currency,
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} transaction`
      }, { transaction: t });

      return transaction;
    });

    res.status(201).json({
      message: 'Transaction successful',
      transaction: result,
      newBalance
    });
  } catch (error) {
    logger.error('Transaction error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Invalid transaction data' });
    }
    res.status(500).json({ message: 'Failed to process transaction' });
  }
};
