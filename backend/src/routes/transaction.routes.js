import express from 'express';
import { getTransactions, createTransaction } from '../controllers/transaction.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// Protected routes - require authentication
router.use(authMiddleware);

// Get user's transactions
router.get('/', getTransactions);

// Create a new transaction
router.post('/', createTransaction);

export default router;
