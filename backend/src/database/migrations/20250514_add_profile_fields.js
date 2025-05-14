import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

export const up = async () => {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.addColumn('users', 'phone', {
    type: DataTypes.STRING,
    allowNull: true
  });

  await queryInterface.addColumn('users', 'avatar', {
    type: DataTypes.STRING,
    allowNull: true
  });

  await queryInterface.addColumn('users', 'preferred_currency', {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'USD'
  });

  await queryInterface.addColumn('users', 'notifications_enabled', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  });
};

export const down = async () => {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.removeColumn('users', 'phone');
  await queryInterface.removeColumn('users', 'avatar');
  await queryInterface.removeColumn('users', 'preferred_currency');
  await queryInterface.removeColumn('users', 'notifications_enabled');
};
