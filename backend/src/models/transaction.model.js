import { DataTypes } from 'sequelize';
import { sequelize } from '../database/db.js';

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  walletId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'wallets',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'check_deposit', 'exchange']]
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
      isIn: [['USD', 'MXN', 'PHP']]
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
