import { logger } from '../utils/logger.js';
import { sequelize } from '../database/db.js';
import { Wallet, Transaction } from '../models/index.js';

// Mock exchange rates for demo (based on approximate real rates)
const MOCK_RATES = {
  'USD': { 'EUR': 0.91, 'GBP': 0.79, 'JPY': 143.50, 'AUD': 1.48, 'CAD': 1.34, 'CHF': 0.89, 'CNY': 7.14 },
  'EUR': { 'USD': 1.10, 'GBP': 0.87, 'JPY': 157.63, 'AUD': 1.63, 'CAD': 1.47, 'CHF': 0.98, 'CNY': 7.84 },
  'GBP': { 'USD': 1.27, 'EUR': 1.15, 'JPY': 181.18, 'AUD': 1.87, 'CAD': 1.69, 'CHF': 1.12, 'CNY': 9.01 },
  'JPY': { 'USD': 0.0070, 'EUR': 0.0063, 'GBP': 0.0055, 'AUD': 0.0103, 'CAD': 0.0093, 'CHF': 0.0062, 'CNY': 0.0497 },
  'AUD': { 'USD': 0.68, 'EUR': 0.61, 'GBP': 0.53, 'JPY': 97.15, 'CAD': 0.91, 'CHF': 0.60, 'CNY': 4.83 },
  'CAD': { 'USD': 0.75, 'EUR': 0.68, 'GBP': 0.59, 'JPY': 107.09, 'AUD': 1.10, 'CHF': 0.66, 'CNY': 5.33 },
  'CHF': { 'USD': 1.13, 'EUR': 1.02, 'GBP': 0.89, 'JPY': 161.24, 'AUD': 1.66, 'CAD': 1.51, 'CNY': 8.02 },
  'CNY': { 'USD': 0.14, 'EUR': 0.13, 'GBP': 0.11, 'JPY': 20.10, 'AUD': 0.21, 'CAD': 0.19, 'CHF': 0.12 }
};

export const getExchangeRates = async (req, res) => {
  try {
    // In a real application, we would fetch real-time rates from an API
    res.json({ rates: MOCK_RATES });
  } catch (error) {
    logger.error('Error fetching exchange rates:', error);
    res.status(500).json({ message: 'Error fetching exchange rates' });
  }
};

export const executeExchange = async (req, res) => {
  const { fromWalletId, toWalletId, amount } = req.body;
  logger.info('Exchange request:', { fromWalletId, toWalletId, amount });

  try {
    // Validate input
    if (!fromWalletId || !toWalletId || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    // Verify wallet ownership and get currencies
    const wallets = await Wallet.findAll({
      where: {
        id: [fromWalletId, toWalletId],
        userId: req.user.id
      }
    });

    if (wallets.length !== 2) {
      throw new Error('One or both wallets not found or unauthorized');
    }

    const fromWallet = wallets.find(w => w.id === fromWalletId);
    const toWallet = wallets.find(w => w.id === toWalletId);

    // Check if we have enough balance
    const currentBalance = parseFloat(fromWallet.balance);
    if (isNaN(currentBalance)) {
      throw new Error('Invalid wallet balance');
    }
    
    if (currentBalance < parsedAmount) {
      return res.status(400).json({ 
        message: 'Insufficient funds',
        available: currentBalance,
        required: parsedAmount
      });
    }

    // Get exchange rate
    const rate = MOCK_RATES[fromWallet.currency][toWallet.currency];
    if (!rate) {
      throw new Error('Exchange rate not available');
    }

    // Calculate converted amount
    const convertedAmount = parsedAmount * rate;
    logger.info('Exchange calculation:', { 
      fromAmount: parsedAmount,
      rate,
      convertedAmount
    });

    // Use Sequelize transaction
    const result = await sequelize.transaction(async (t) => {
      // Update balances
      const newFromBalance = parseFloat(fromWallet.balance) - parsedAmount;
      const newToBalance = parseFloat(toWallet.balance) + convertedAmount;

      await fromWallet.update({
        balance: newFromBalance
      }, { transaction: t });

      await toWallet.update({
        balance: newToBalance
      }, { transaction: t });

      // Refresh wallet data
      await fromWallet.reload({ transaction: t });
      await toWallet.reload({ transaction: t });

      // Create transaction records
      await Transaction.create({
        userId: req.user.id,
        walletId: fromWalletId,
        type: 'exchange',
        amount: parsedAmount,
        currency: fromWallet.currency,
        description: `Exchanged ${parsedAmount} ${fromWallet.currency} to ${toWallet.currency}`
      }, { transaction: t });

      await Transaction.create({
        userId: req.user.id,
        walletId: toWalletId,
        type: 'exchange',
        amount: convertedAmount,
        currency: toWallet.currency,
        description: `Received ${convertedAmount} ${toWallet.currency} from ${fromWallet.currency}`
      }, { transaction: t });

      return {
        fromAmount: parsedAmount,
        toAmount: convertedAmount,
        rate,
        fromBalance: fromWallet.balance,
        toBalance: toWallet.balance
      };
    });

    res.json({
      message: 'Exchange successful',
      ...result
    });
  } catch (error) {
    logger.error('Exchange error:', error);
    res.status(400).json({ message: error.message });
  }
};
