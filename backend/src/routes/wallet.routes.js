import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import { getWallets, getTransactions, createTransaction, createWallet } from '../controllers/wallet.controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/', createWallet);
router.get('/', getWallets);
router.get('/:walletId/transactions', getTransactions);
router.post('/transaction', createTransaction);

export default router;
