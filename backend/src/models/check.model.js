import { DataTypes } from 'sequelize';
import { sequelize } from '../database/db.js';

const Check = sequelize.define('Checks', {
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
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  checkNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  routingNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [9, 9]
    }
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [4, 17]
    }
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  payeeName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  checkDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  depositDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending_verification',
    validate: {
      isIn: [['pending_verification', 'verified', 'processing', 'completed', 'rejected', 'on_hold']]
    }
  },
  verificationMethod: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'standard',
    validate: {
      isIn: [['standard', 'enhanced', 'manual']]
    }
  },
  holdDuration: {
    type: DataTypes.INTEGER,  // in hours
    allowNull: false,
    defaultValue: 48
  },
  riskScore: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  rejectionReason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  verificationNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  }
});

export default Check;
