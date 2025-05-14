import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

// Default JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

const authMiddleware = async (req, res, next) => {
  try {
    logger.info('Authenticating request');
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.error('No authorization header found');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      logger.error('No token found in authorization header');
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not found in environment');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    logger.info('Token verified successfully:', { userId: decoded.id });
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    logger.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(401).json({ message: 'Invalid token' });
  }
};

export default authMiddleware;
