import { logger } from '../utils/logger.js';
import { sequelize } from '../database/db.js';
import { Wallet, Transaction } from '../models/index.js';

export const depositCheck = async (req, res) => {
  try {
    const { walletId, amount } = req.body;
    const checkImage = req.file; // multer adds the file to req.file

    if (!walletId || !amount) {
      throw new Error('Wallet ID and amount are required');
    }

    // Verify wallet ownership
    const wallet = await Wallet.findOne({
      where: { id: walletId, userId: req.user.id }
    });

    if (!wallet) {
      throw new Error('Wallet not found or unauthorized');
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Invalid amount');
    }

    // In a real application, we would:
    // 1. Store the check image
    // 2. Process the check through a check processing service
    // 3. Wait for confirmation before updating balance

    // For demo purposes, we'll simulate immediate success
    const newBalance = parseFloat(wallet.balance) + parsedAmount;

    // Use Sequelize transaction
    const result = await sequelize.transaction(async (t) => {
      // Update wallet balance
      await wallet.update({ balance: newBalance }, { transaction: t });

      // Create transaction record
      const transaction = await Transaction.create({
        userId: req.user.id,
        walletId,
        type: 'check_deposit',
        amount: parsedAmount,
        currency: wallet.currency,
        status: 'completed',
        description: checkImage ? `Check deposit - ${checkImage.originalname}` : 'Manual deposit'
      }, { transaction: t });

      return transaction;
    });

    res.status(201).json({
      message: 'Check deposit successful',
      transaction: result,
      newBalance
    });
  } catch (error) {
    logger.error('Check deposit error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const getCheckDeposits = async (req, res) => {
  try {
    const deposits = await Transaction.findAll({
      where: { 
        userId: req.user.id,
        type: 'check_deposit'
      },
      order: [['createdAt', 'DESC']]
    });

    res.json(deposits);
  } catch (error) {
    logger.error('Error fetching check deposits:', error);
    res.status(500).json({ message: 'Error fetching check deposits' });
  }
};
