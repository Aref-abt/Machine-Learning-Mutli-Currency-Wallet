import Transaction from '../models/transaction.model.js';

export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const transactions = await Transaction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 30 // Get last 30 transactions for analysis
    });

    res.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

export const createTransaction = async (req, res) => {
  try {
    const { amount, currency, type, description } = req.body;
    const userId = req.user.id;

    const transaction = await Transaction.create({
      userId,
      amount,
      currency,
      type,
      description
    });

    res.status(201).json({ transaction });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};
