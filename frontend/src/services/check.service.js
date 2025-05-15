import axios from 'axios';

class CheckService {
  constructor() {
    this.apiUrl = process.env.VUE_APP_API_URL || 'http://localhost:3000';
    // Integration configurations
    this.integrations = {
      allTrust: {
        enabled: true,
        apiKey: process.env.VUE_APP_ALLTRUST_API_KEY,
        endpoint: process.env.VUE_APP_ALLTRUST_ENDPOINT
      },
      smartCheck: {
        enabled: true,
        apiKey: process.env.VUE_APP_SMARTCHECK_API_KEY,
        endpoint: process.env.VUE_APP_SMARTCHECK_ENDPOINT
      }
    };
  }

  async validateCheck(checkData) {
    try {
      // Initial validation
      const validationErrors = this.validateCheckData(checkData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Get risk assessment from backend
      const response = await axios.post(`${this.apiUrl}/api/checks/validate`, checkData);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to validate check');
    }
  }

  validateCheckData(checkData) {
    const errors = [];

    // Amount validation
    if (parseFloat(checkData.amount) > 50000) {
      errors.push('Amount exceeds maximum limit of $50,000');
    }

    // Check date validation
    const checkDate = new Date(checkData.checkDate);
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    if (checkDate > today) {
      errors.push('Check date cannot be in the future');
    }
    if (checkDate < sixMonthsAgo) {
      errors.push('Check is more than 6 months old');
    }

    // Routing number validation
    if (!/^\d{9}$/.test(checkData.routingNumber)) {
      errors.push('Invalid routing number format');
    } else {
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(checkData.routingNumber[i]) * [3, 7, 1, 3, 7, 1, 3, 7, 1][i];
      }
      if (sum % 10 !== 0) {
        errors.push('Invalid routing number checksum');
      }
    }

    return errors;
  }

  async processCheckDeposit(checkData) {
    try {
      // Process with external check verification services
      const verificationResults = await Promise.all([
        this.verifyWithAllTrust(checkData),
        this.verifyWithSmartCheck(checkData)
      ]);

      // Combine verification results
      const combinedVerification = this.combineVerificationResults(verificationResults);

      // Submit to backend with verification results
      const response = await axios.post(`${this.apiUrl}/api/checks/deposit`, {
        ...checkData,
        verificationResults: combinedVerification
      });

      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to process check deposit');
    }
  }

  async verifyWithAllTrust(checkData) {
    if (!this.integrations.allTrust.enabled) return null;

    try {
      const response = await axios.post(
        this.integrations.allTrust.endpoint,
        {
          checkImage: checkData.checkImage,
          amount: checkData.amount,
          routingNumber: checkData.routingNumber,
          accountNumber: checkData.accountNumber
        },
        {
          headers: {
            'Authorization': `Bearer ${this.integrations.allTrust.apiKey}`
          }
        }
      );

      return {
        provider: 'allTrust',
        verified: response.data.verified,
        score: response.data.confidenceScore,
        details: response.data.verificationDetails
      };
    } catch (error) {
      console.error('AllTrust verification failed:', error);
      return {
        provider: 'allTrust',
        verified: false,
        error: error.message
      };
    }
  }

  async verifyWithSmartCheck(checkData) {
    if (!this.integrations.smartCheck.enabled) return null;

    try {
      const response = await axios.post(
        this.integrations.smartCheck.endpoint,
        {
          check: {
            image: checkData.checkImage,
            amount: checkData.amount,
            routing: checkData.routingNumber,
            account: checkData.accountNumber,
            date: checkData.checkDate
          }
        },
        {
          headers: {
            'X-API-Key': this.integrations.smartCheck.apiKey
          }
        }
      );

      return {
        provider: 'smartCheck',
        verified: response.data.isValid,
        score: response.data.riskScore,
        details: response.data.verificationDetails
      };
    } catch (error) {
      console.error('SmartCheck verification failed:', error);
      return {
        provider: 'smartCheck',
        verified: false,
        error: error.message
      };
    }
  }

  combineVerificationResults(results) {
    const validResults = results.filter(result => result !== null);
    
    if (validResults.length === 0) {
      return {
        verified: false,
        message: 'No verification services available'
      };
    }

    const allVerified = validResults.every(result => result.verified);
    const averageScore = validResults.reduce((sum, result) => sum + (result.score || 0), 0) / validResults.length;

    return {
      connected: true,
      systemType,
      features: ['deposit', 'history', 'verification'],
      // We can add system-specific features here
    };
  }
}

export default new CheckService();
