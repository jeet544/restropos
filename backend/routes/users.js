const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { checkRequired, isValidEmail, isOneOf } = require('../middleware/validate');
const { successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

const SALT_ROUNDS = 10;
const VALID_ROLES = [
  'ADMIN', 'MANAGER', 'WAITER', 'CASHIER', 'CHEF',
  'admin', 'manager', 'staff', 'kitchen', 'cashier'
];

// All user routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

/**
 * GET /api/users
 * List all users (without passwords)
 */
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return res.status(200).json(successResponse(users));
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * POST /api/users
 * Create a new user. Hash password with bcrypt.
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    const missing = checkRequired(req.body, ['name', 'email', 'password']);
    if (missing.length > 0) {
      return res.status(400).json(errorResponse(`Missing required fields: ${missing.join(', ')}`));
    }

    if (!isValidEmail(email)) {
      return res.status(400).json(errorResponse('Invalid email format.'));
    }

    if (password.length < 6) {
      return res.status(400).json(errorResponse('Password must be at least 6 characters long.'));
    }

    if (role && !isOneOf(role, VALID_ROLES)) {
      return res.status(400).json(
        errorResponse(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`)
      );
    }

    // Check for duplicate email
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json(errorResponse('A user with this email already exists.'));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const userRole = role || 'staff';

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hashedPassword, userRole]
    );

    const [newUser] = await pool.query(
      'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json(successResponse(newUser[0], 'User created successfully.'));
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * PUT /api/users/:id
 * Update a user (can change name, email, role; if password provided, hash it)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;

    // Check user exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json(errorResponse('User not found.'));
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (email !== undefined) {
      if (!isValidEmail(email)) {
        return res.status(400).json(errorResponse('Invalid email format.'));
      }
      // Check for duplicate email (excluding current user)
      const [duplicate] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email.trim().toLowerCase(), id]
      );
      if (duplicate.length > 0) {
        return res.status(409).json(errorResponse('A user with this email already exists.'));
      }
      updates.push('email = ?');
      params.push(email.trim().toLowerCase());
    }

    if (role !== undefined) {
      if (!isOneOf(role, VALID_ROLES)) {
        return res.status(400).json(
          errorResponse(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`)
        );
      }
      updates.push('role = ?');
      params.push(role);
    }

    if (password !== undefined) {
      if (password.length < 6) {
        return res.status(400).json(errorResponse('Password must be at least 6 characters long.'));
      }
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json(errorResponse('No fields to update.'));
    }

    params.push(id);
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [updatedUser] = await pool.query(
      'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    return res.status(200).json(successResponse(updatedUser[0], 'User updated successfully.'));
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

module.exports = router;
