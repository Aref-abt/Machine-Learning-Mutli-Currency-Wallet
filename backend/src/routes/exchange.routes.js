import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import { getExchangeRates, executeExchange } from '../controllers/exchange.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/rates', getExchangeRates);
router.post('/execute', executeExchange);

export default router;
