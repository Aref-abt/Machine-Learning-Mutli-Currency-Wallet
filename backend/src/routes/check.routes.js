import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.js';
import { depositCheck, getCheckDeposits, validateCheck } from '../controllers/check.controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/validate', validateCheck);
router.post('/deposit', upload.single('checkImage'), depositCheck);
router.get('/deposit/history', getCheckDeposits);

export default router;
