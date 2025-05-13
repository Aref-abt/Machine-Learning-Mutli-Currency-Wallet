import api from '../api';

export class WalletService {
  static async getExchangeRates() {
    try {
      const response = await api.get('/exchange/rates');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error fetching exchange rates' };
    }
  }

  static async executeExchange(fromWalletId, toWalletId, amount) {
    try {
      const response = await api.post('/exchange/execute', {
        fromWalletId,
        toWalletId,
        amount
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        throw error.response.data;
      }
      throw { message: 'Error executing exchange' };
    }
  }
  static async getWallets() {
    try {
      const response = await api.get('/wallet');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error fetching wallets' };
    }
  }

  static async createWallet(currency) {
    try {
      const response = await api.post('/wallet', { currency });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error creating wallet' };
    }
  }

  static async getTransactions(walletId) {
    try {
      const response = await api.get(`/wallet/${walletId}/transactions`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error fetching transactions' };
    }
  }

  static async createTransaction(walletId, type, amount, currency) {
    try {
      const response = await api.post('/wallet/transaction', {
        walletId,
        type,
        amount,
        currency
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error creating transaction' };
    }
  }
}
