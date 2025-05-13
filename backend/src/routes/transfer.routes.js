import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import { transfer, getTransferHistory } from '../controllers/transfer.controller.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', authMiddleware, transfer);
router.get('/history', getTransferHistory);

export default router;
