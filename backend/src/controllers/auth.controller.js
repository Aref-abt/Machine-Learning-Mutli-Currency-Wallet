import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { Op } from 'sequelize';
import { logger } from '../utils/logger.js';
import { sequelize } from '../database/db.js';
import { User, Wallet } from '../models/index.js';

// Default JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'), false);
    }
    cb(null, true);
  }
}).single('avatar');

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one uppercase letter' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one number' });
    }

    // Check if user already exists - use transaction for atomicity
    const result = await sequelize.transaction(async (t) => {
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ username }, { email }]
        },
        transaction: t
      });

      if (existingUser) {
        throw new Error('Username or email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        username,
        email,
        password: hashedPassword
      }, { transaction: t });

      // Create default wallet
      await Wallet.create({
        userId: user.id,
        name: 'Default Wallet',
        currency: 'USD',
        balance: 0
      }, { transaction: t });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );

      return { user, token };
    });

    // Send response
    res.status(201).json({
      message: 'Registration successful',
      token: result.token,
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    if (error.message === 'Username or email already exists') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Registration failed' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        logger.error('File upload error:', err);
        return res.status(400).json({ message: err.message });
      }

      const { id } = req.user; // From auth middleware
      const { name, email, phone, preferredCurrency, notifications } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update user fields
      if (name) user.name = name;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      if (preferredCurrency) user.preferred_currency = preferredCurrency;
      if (notifications !== undefined) user.notifications_enabled = notifications;
      
      // Update avatar if uploaded
      if (req.file) {
        user.avatar = `/uploads/avatars/${req.file.filename}`;
      }

      await user.save();
      logger.info('Profile updated successfully:', { userId: id });

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatar: user.avatar,
          preferredCurrency: user.preferred_currency,
          notifications: user.notifications_enabled
        }
      });
    });
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    logger.info('Attempting login:', { email });
    // Find user
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    logger.info('Generating JWT for login:', { userId: user.id });
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );
    logger.info('JWT generated successfully');

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};
