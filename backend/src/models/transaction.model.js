import { DataTypes } from 'sequelize';
import { sequelize } from '../database/db.js';

const Transaction = sequelize.define('Transactions', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  walletId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Wallets',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'exchange', 'check_deposit']]
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY']]
    }
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'completed',
    validate: {
      isIn: [['pending', 'completed', 'failed']]
    }
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
});



export default Transaction;
