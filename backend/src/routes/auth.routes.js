import { Router } from 'express';
import { register, login, updateProfile } from '../controllers/auth.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/profile', authMiddleware, updateProfile);

export default router;
