import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.js';
import { depositCheck, getCheckDeposits } from '../controllers/check.controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/deposit', upload.single('checkImage'), depositCheck);
router.get('/deposits', getCheckDeposits);

export default router;
