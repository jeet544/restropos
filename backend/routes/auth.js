const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRequired, isValidEmail } = require('../middleware/validate');
const { successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

/**
 * POST /api/auth/login
 * Validate email + password, return JWT token + user info (without password)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    const missing = checkRequired(req.body, ['email', 'password']);
    if (missing.length > 0) {
      return res.status(400).json(errorResponse(`Missing required fields: ${missing.join(', ')}`));
    }

    if (!isValidEmail(email)) {
      return res.status(400).json(errorResponse('Invalid email format.'));
    }

    // Find user by email
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json(errorResponse('Invalid email or password.'));
    }

    const user = users[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json(errorResponse('Invalid email or password.'));
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Return user info without password
    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json(successResponse({
      token,
      user: userWithoutPassword,
    }, 'Login successful.'));
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * POST /api/auth/logout
 * Client-side token removal, return success
 */
router.post('/logout', (req, res) => {
  return res.status(200).json(successResponse(null, 'Logged out successfully.'));
});

/**
 * GET /api/auth/me
 * Return current user from JWT (requires auth)
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json(errorResponse('User not found.'));
    }

    return res.status(200).json(successResponse(users[0]));
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

module.exports = router;
