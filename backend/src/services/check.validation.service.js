import { Op } from 'sequelize';
import Check from '../models/check.model.js';

class CheckValidationService {
  constructor() {
    this.riskFactors = {
      amount: {
        high: 5000,
        veryHigh: 10000
      },
      frequency: {
        maxDaily: 3,
        maxWeekly: 10
      },
      holdPeriods: {
        standard: 48,    // 2 days
        high: 72,        // 3 days
        veryHigh: 120    // 5 days
      }
    };
  }

  async validateCheck(checkData, userId) {
    const riskScore = await this.calculateRiskScore(checkData, userId);
    const verificationResult = await this.determineVerificationMethod(riskScore, checkData);
    const holdDuration = this.calculateHoldDuration(riskScore, checkData.amount);

    return {
      ...verificationResult,
      holdDuration,
      riskScore
    };
  }

  async calculateRiskScore(checkData, userId) {
    let riskScore = 0;

    // Amount-based risk
    if (checkData.amount >= this.riskFactors.amount.veryHigh) {
      riskScore += 40;
    } else if (checkData.amount >= this.riskFactors.amount.high) {
      riskScore += 20;
    }

    // Frequency-based risk
    const recentChecks = await this.getRecentChecks(userId);
    if (recentChecks.daily >= this.riskFactors.frequency.maxDaily) {
      riskScore += 30;
    }
    if (recentChecks.weekly >= this.riskFactors.frequency.maxWeekly) {
      riskScore += 20;
    }

    // Bank verification risk
    const bankValidation = await this.validateBankDetails(checkData);
    riskScore += bankValidation.riskScore;

    // Historical risk
    const historicalRisk = await this.checkHistoricalRisk(userId);
    riskScore += historicalRisk;

    return Math.min(100, riskScore);
  }

  async getRecentChecks(userId) {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [daily, weekly] = await Promise.all([
      Check.count({
        where: {
          userId,
          depositDate: {
            [Op.gte]: oneDayAgo
          }
        }
      }),
      Check.count({
        where: {
          userId,
          depositDate: {
            [Op.gte]: oneWeekAgo
          }
        }
      })
    ]);

    return { daily, weekly };
  }

  async validateBankDetails(checkData) {
    // This would integrate with a bank validation service
    // For now, we'll use basic routing number validation
    const routingNumber = checkData.routingNumber;
    
    // Basic routing number validation algorithm
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(routingNumber[i]) * [3, 7, 1, 3, 7, 1, 3, 7, 1][i];
    }

    return {
      isValid: sum % 10 === 0,
      riskScore: sum % 10 === 0 ? 0 : 25
    };
  }

  async checkHistoricalRisk(userId) {
    const rejectedChecks = await Check.count({
      where: {
        userId,
        status: 'rejected',
        depositDate: {
          [Op.gte]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
        }
      }
    });

    return rejectedChecks * 15; // Each past rejection adds 15 to risk score
  }

  async determineVerificationMethod(riskScore, checkData) {
    if (riskScore >= 70) {
      return {
        verificationMethod: 'manual',
        status: 'pending_verification',
        message: 'Check requires manual review due to high risk factors.'
      };
    }

    if (riskScore >= 40) {
      return {
        verificationMethod: 'enhanced',
        status: 'pending_verification',
        message: 'Additional verification required.'
      };
    }

    return {
      verificationMethod: 'standard',
      status: 'processing',
      message: 'Check is being processed.'
    };
  }

  calculateHoldDuration(riskScore, amount) {
    if (riskScore >= 70 || amount >= this.riskFactors.amount.veryHigh) {
      return this.riskFactors.holdPeriods.veryHigh;
    }
    
    if (riskScore >= 40 || amount >= this.riskFactors.amount.high) {
      return this.riskFactors.holdPeriods.high;
    }

    return this.riskFactors.holdPeriods.standard;
  }
}

export default new CheckValidationService();
