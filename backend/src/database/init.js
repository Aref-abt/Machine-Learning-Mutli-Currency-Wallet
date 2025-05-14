import { sequelize } from './db.js';
import '../models/index.js';

// Initialize database
export const initializeDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync all models with force to recreate tables
    await sequelize.sync({ force: true });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

