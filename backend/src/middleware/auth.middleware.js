import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    logger.info('Auth token:', { token: token?.substring(0, 10) + '...' });

    if (!token) {
      logger.warn('No token provided');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.info('Decoded token:', { userId: decoded.id, email: decoded.email });

    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Auth error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export { authMiddleware };
