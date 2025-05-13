import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { logger } from './utils/logger.js';
import { initializeDatabase } from './database/init.js';
import authRoutes from './routes/auth.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import exchangeRoutes from './routes/exchange.routes.js';
import transferRoutes from './routes/transfer.routes.js';
import checkRoutes from './routes/check.routes.js';
import transactionRoutes from './routes/transaction.routes.js';

// Load environment variables
config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:51903'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/check', checkRoutes);
app.use('/api/exchange', exchangeRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/transactions', transactionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
  });
}).catch(err => {
  logger.error('Failed to initialize database:', err);
  process.exit(1);
});
