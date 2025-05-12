import { logger } from '../utils/logger.js';
import { sequelize } from '../database/db.js';
import { Wallet, Transaction } from '../models/index.js';

// Mock exchange rates for demo
const MOCK_RATES = {
  'USD': { 'MXN': 17.50, 'PHP': 55.75 },
  'MXN': { 'USD': 0.057, 'PHP': 3.18 },
  'PHP': { 'USD': 0.018, 'MXN': 0.31 }
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
        walletId: fromWalletId,
        type: 'exchange',
        amount: parsedAmount,
        currency: fromWallet.currency,
        description: `Exchanged ${parsedAmount} ${fromWallet.currency} to ${toWallet.currency}`
      }, { transaction: t });

      await Transaction.create({
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
