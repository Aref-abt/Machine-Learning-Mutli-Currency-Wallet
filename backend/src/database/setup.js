import pg from 'pg';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

let pool;

export const setupDatabase = async () => {
  pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    await pool.query('SELECT NOW()');
    logger.info('Database connection established');
    await createTables();
  } catch (err) {
    logger.error('Database connection failed:', err);
    throw err;
  }
};

export const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  return pool;
};

async function createTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Wallets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        currency VARCHAR(3) NOT NULL,
        balance DECIMAL(20, 8) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, currency)
      )
    `);

    // Transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        wallet_id INTEGER REFERENCES wallets(id),
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(20, 8) NOT NULL,
        currency VARCHAR(3) NOT NULL,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Exchange rates history
    await client.query(`
      CREATE TABLE IF NOT EXISTS exchange_rates (
        id SERIAL PRIMARY KEY,
        from_currency VARCHAR(3) NOT NULL,
        to_currency VARCHAR(3) NOT NULL,
        rate DECIMAL(20, 8) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    logger.info('Database tables created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error creating tables:', err);
    throw err;
  } finally {
    client.release();
  }
}
