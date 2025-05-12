import { sequelize } from './db.js';
import '../models/index.js';

// Initialize database
export const initializeDatabase = async () => {
  try {
    // Sync all models
    await sequelize.sync();
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

