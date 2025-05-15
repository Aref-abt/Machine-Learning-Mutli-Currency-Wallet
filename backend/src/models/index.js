import { sequelize } from '../database/db.js';
import User from './user.model.js';
import Wallet from './wallet.model.js';
import Transaction from './transaction.model.js';
import Check from './check.model.js';

// Define relationships
User.hasMany(Wallet, { foreignKey: 'userId' });
Wallet.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Transaction, { foreignKey: 'userId' });
Transaction.belongsTo(User, { foreignKey: 'userId' });

Wallet.hasMany(Transaction, { foreignKey: 'walletId', as: 'transactions' });
Transaction.belongsTo(Wallet, { foreignKey: 'walletId' });

Check.belongsTo(Transaction, { as: 'transaction', foreignKey: 'transactionId' });
Transaction.hasOne(Check, { as: 'check', foreignKey: 'transactionId' });

export {
  User,
  Wallet,
  Transaction,
  Check
};
