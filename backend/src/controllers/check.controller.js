import { logger } from '../utils/logger.js';
import { sequelize } from '../database/db.js';
import { Wallet, Transaction, Check } from '../models/index.js';
import checkValidationService from '../services/check.validation.service.js';

export const validateCheck = async (req, res) => {
  try {
    const checkData = req.body;
    const validationResult = await checkValidationService.validateCheck(checkData, req.user.id);
    res.json(validationResult);
  } catch (error) {
    logger.error('Check validation error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const depositCheck = async (req, res) => {
  try {
    const { walletId, amount, checkNumber, routingNumber, accountNumber, bankName, payeeName, checkDate, verificationResults } = req.body;
    const checkImage = req.file;

    if (!walletId || !amount || !checkNumber || !routingNumber || !accountNumber || !bankName || !payeeName || !checkDate) {
      throw new Error('Missing required check information');
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

    // Get risk assessment
    const riskAssessment = await checkValidationService.validateCheck({
      amount: parsedAmount,
      checkNumber,
      routingNumber,
      accountNumber,
      bankName,
      checkDate
    }, req.user.id);

    // Use Sequelize transaction
    const result = await sequelize.transaction(async (t) => {
      // Create check record
      const check = await Check.create({
        userId: req.user.id,
        walletId,
        amount: parsedAmount,
        checkNumber,
        routingNumber,
        accountNumber,
        bankName,
        payeeName,
        checkDate,
        status: riskAssessment.status,
        verificationMethod: riskAssessment.verificationMethod,
        holdDuration: riskAssessment.holdDuration,
        riskScore: riskAssessment.riskScore,
        verificationNotes: JSON.stringify(verificationResults)
      }, { transaction: t });

      // Create transaction record
      const transaction = await Transaction.create({
        userId: req.user.id,
        walletId,
        type: 'check_deposit',
        amount: parsedAmount,
        currency: wallet.currency,
        status: riskAssessment.status === 'processing' ? 'pending' : riskAssessment.status,
        description: `Check deposit - ${bankName} #${checkNumber}`
      }, { transaction: t });

      // Only update balance if check is not held or pending verification
      if (riskAssessment.status === 'processing') {
        const newBalance = parseFloat(wallet.balance) + parsedAmount;
        await wallet.update({ balance: newBalance }, { transaction: t });
      }

      return { check, transaction };
    });

    res.status(201).json({
      message: 'Check deposit processed',
      status: result.check.status,
      depositId: result.check.id,
      holdDuration: result.check.holdDuration,
      verificationMethod: result.check.verificationMethod
    });
  } catch (error) {
    logger.error('Check deposit error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const getCheckDeposits = async (req, res) => {
  try {
    const deposits = await Check.findAll({
      where: { userId: req.user.id },
      include: [{
        model: Transaction,
        as: 'transaction'
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(deposits.map(deposit => ({
      id: deposit.id,
      amount: deposit.amount,
      currency: deposit.transaction ? deposit.transaction.currency : 'USD',
      status: deposit.status,
      bankName: deposit.bankName,
      checkNumber: deposit.checkNumber,
      depositDate: deposit.createdAt,
      verificationMethod: deposit.verificationMethod,
      holdDuration: deposit.holdDuration
    })));
  } catch (error) {
    logger.error('Error fetching check deposits:', error);
    res.status(500).json({ message: 'Error fetching check deposits' });
  }
};
