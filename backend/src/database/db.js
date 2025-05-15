import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './ml_wallet.sqlite',
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  }
});

// Ensure database and tables are created
export const initializeDatabase = async (force = false) => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Only force sync if explicitly requested
    await sequelize.sync({ force });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};
