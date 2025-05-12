import { DataTypes } from 'sequelize';
import { sequelize } from '../database/db.js';

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['USD', 'MXN', 'PHP']]
    }
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'Wallet',
  tableName: 'wallets'
});

export default Wallet;
