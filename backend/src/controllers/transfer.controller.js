import { sequelize } from '../database/db.js';
import { Wallet, Transaction } from '../models/index.js';
import { logger } from '../utils/logger.js';

// Mock data for demonstration
const transfers = [];

const transfer = async (req, res) => {
  const { fromWalletId, toWalletId, amount } = req.body;

  try {
    // Validate input
    if (!fromWalletId || !toWalletId || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Verify wallet ownership
    const fromWallet = await Wallet.findOne({
      where: { id: fromWalletId, userId: req.user.id }
    });

    if (!fromWallet) {
      return res.status(404).json({ message: 'Source wallet not found or unauthorized' });
    }

    // Find recipient wallet
    const toWallet = await Wallet.findOne({
      where: { id: toWalletId }
    });

    if (!toWallet) {
      return res.status(404).json({ message: 'Recipient wallet not found' });
    }

    // Verify sufficient balance
    const currentBalance = parseFloat(fromWallet.balance);
    if (currentBalance < parsedAmount) {
      return res.status(400).json({
        message: 'Insufficient balance',
        available: currentBalance,
        required: parsedAmount
      });
    }

    if (fromWallet.currency !== toWallet.currency) {
      return res.status(400).json({ message: 'Cannot transfer between different currencies. Please use exchange.' });
    }

    if (fromWalletId === toWalletId) {
      return res.status(400).json({ message: 'Cannot transfer to the same wallet' });
    }

    // Use Sequelize transaction
    const result = await sequelize.transaction(async (t) => {
      // Update source wallet balance
      const newFromBalance = parseFloat(fromWallet.balance) - parsedAmount;
      await fromWallet.update({
        balance: newFromBalance
      }, { transaction: t });

      // Update recipient wallet balance
      const newToBalance = parseFloat(toWallet.balance) + parsedAmount;
      await toWallet.update({
        balance: newToBalance
      }, { transaction: t });

      // Create transaction records
      const outgoingTransaction = await Transaction.create({
        walletId: fromWalletId,
        type: 'transfer_out',
        amount: parsedAmount,
        currency: fromWallet.currency,
        status: 'completed',
        description: `Transfer to ${toWallet.currency} wallet`
      }, { transaction: t });

      const incomingTransaction = await Transaction.create({
        walletId: toWalletId,
        type: 'transfer_in',
        amount: parsedAmount,
        currency: toWallet.currency,
        status: 'completed',
        description: `Transfer from ${fromWallet.currency} wallet`
      }, { transaction: t });

      return { 
        outgoingTransaction, 
        incomingTransaction,
        newFromBalance,
        newToBalance
      };
    });

    res.status(201).json({
      message: 'Transfer successful',
      fromTransaction: result.outgoingTransaction,
      toTransaction: result.incomingTransaction,
      fromBalance: result.newFromBalance,
      toBalance: result.newToBalance
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(400).json({ message: error.message });
  }
};

const getTransferHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await Transaction.findAll({
      where: {
        type: ['transfer_in', 'transfer_out'],
      },
      include: [{
        model: Wallet,
        where: { userId }
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(transactions);
  } catch (error) {
    logger.error('Error fetching transfer history:', error);
    res.status(500).json({ message: 'Failed to fetch transfer history' });
  }
};

export { transfer, getTransferHistory };
