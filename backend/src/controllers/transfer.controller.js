import { sequelize } from '../database/db.js';
import { Wallet, Transaction } from '../models/index.js';
import { logger } from '../utils/logger.js';

// Mock data for demonstration
const transfers = [];

const transfer = async (req, res) => {
  const fromWalletId = req.method === 'GET' ? req.query.fromWalletId : req.body.fromWalletId;
  const toWalletId = req.method === 'GET' ? req.query.toWalletId : req.body.toWalletId;
  const amount = req.method === 'GET' ? req.query.amount : req.body.amount;

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

    // If currencies are different, calculate exchange rate
    let finalAmount = parsedAmount;
    let exchangeRate = null;

    if (fromWallet.currency !== toWallet.currency) {
      try {
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromWallet.currency}`);
        const data = await response.json();
        exchangeRate = data.rates[toWallet.currency];
        
        if (!exchangeRate) {
          return res.status(400).json({ 
            message: 'Exchange rate not available for this currency pair'
          });
        }

        finalAmount = parsedAmount * exchangeRate;

        // Return exchange preview if preview flag is true
        if (req.query.preview === 'true') {
          return res.status(200).json({
            fromAmount: parsedAmount,
            fromCurrency: fromWallet.currency,
            toAmount: finalAmount,
            toCurrency: toWallet.currency,
            rate: exchangeRate,
            fees: 0, // You could add transfer fees here
            preview: true
          });
        }

        // If currencies are different and this is not a preview, require confirmation
        if (req.query.confirmed !== 'true') {
          return res.status(400).json({
            message: 'Exchange rate confirmation required',
            fromAmount: parsedAmount,
            fromCurrency: fromWallet.currency,
            toAmount: finalAmount,
            toCurrency: toWallet.currency,
            rate: exchangeRate,
            requiresConfirmation: true
          });
        }
      } catch (error) {
        console.error('Exchange rate error:', error);
        return res.status(500).json({ 
          message: 'Failed to get exchange rate'
        });
      }
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
      const newToBalance = parseFloat(toWallet.balance) + finalAmount;
      await toWallet.update({
        balance: newToBalance
      }, { transaction: t });

      // Create transaction records
      const outgoingTransaction = await Transaction.create({
        userId: req.user.id,
        walletId: fromWalletId,
        type: 'transfer_out',
        amount: parsedAmount,
        currency: fromWallet.currency,
        status: 'completed',
        description: fromWallet.currency === toWallet.currency
          ? `Transfer to ${toWallet.currency} wallet`
          : `Transfer to ${toWallet.currency} wallet (Rate: 1 ${fromWallet.currency} = ${(finalAmount/parsedAmount).toFixed(4)} ${toWallet.currency})`
      }, { transaction: t });

      const incomingTransaction = await Transaction.create({
        userId: toWallet.userId, // Use recipient's userId
        walletId: toWalletId,
        type: 'transfer_in',
        amount: finalAmount,
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

const previewTransfer = async (req, res) => {
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

    // If currencies are different, calculate exchange rate
    let finalAmount = parsedAmount;
    let exchangeRate = 1;

    if (fromWallet.currency !== toWallet.currency) {
      try {
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromWallet.currency}`);
        const data = await response.json();
        exchangeRate = data.rates[toWallet.currency];
        
        if (!exchangeRate) {
          return res.status(400).json({ 
            message: 'Exchange rate not available for this currency pair'
          });
        }

        finalAmount = parsedAmount * exchangeRate;
      } catch (error) {
        console.error('Exchange rate error:', error);
        return res.status(500).json({ 
          message: 'Failed to get exchange rate'
        });
      }
    }

    res.status(200).json({
      fromAmount: parsedAmount,
      fromCurrency: fromWallet.currency,
      toAmount: finalAmount,
      toCurrency: toWallet.currency,
      rate: exchangeRate,
      fees: 0 // You could add transfer fees here
    });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ message: error.message || 'Failed to preview transfer' });
  }
};

export { transfer, getTransferHistory, previewTransfer };
