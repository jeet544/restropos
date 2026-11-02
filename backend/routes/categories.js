const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { checkRequired } = require('../middleware/validate');
const { successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

// All category routes require authentication
router.use(authenticate);

/**
 * GET /api/categories
 * List all categories
 */
router.get('/', async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    return res.status(200).json(successResponse(categories));
  } catch (error) {
    console.error('List categories error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * POST /api/categories
 * Create a new category (ADMIN and MANAGER only)
 */
router.post('/', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { name } = req.body;

    const missing = checkRequired(req.body, ['name']);
    if (missing.length > 0) {
      return res.status(400).json(errorResponse('Category name is required.'));
    }

    const trimmedName = name.trim();

    // Check for duplicate
    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE name = ?',
      [trimmedName]
    );
    if (existing.length > 0) {
      return res.status(409).json(errorResponse('A category with this name already exists.'));
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name) VALUES (?)',
      [trimmedName]
    );

    const [newCategory] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json(successResponse(newCategory[0], 'Category created successfully.'));
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * PUT /api/categories/:id
 * Update a category (ADMIN and MANAGER only)
 */
router.put('/:id', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const missing = checkRequired(req.body, ['name']);
    if (missing.length > 0) {
      return res.status(400).json(errorResponse('Category name is required.'));
    }

    const trimmedName = name.trim();

    // Check category exists
    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json(errorResponse('Category not found.'));
    }

    // Check for duplicate name (excluding current)
    const [duplicate] = await pool.query(
      'SELECT id FROM categories WHERE name = ? AND id != ?',
      [trimmedName, id]
    );
    if (duplicate.length > 0) {
      return res.status(409).json(errorResponse('A category with this name already exists.'));
    }

    await pool.query('UPDATE categories SET name = ? WHERE id = ?', [trimmedName, id]);

    const [updated] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);

    return res.status(200).json(successResponse(updated[0], 'Category updated successfully.'));
  } catch (error) {
    console.error('Update category error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * DELETE /api/categories/:id
 * Delete a category if safe (ADMIN only)
 */
router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT id, name FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json(errorResponse('Category not found.'));
    }

    // Check if any menu items reference this category
    const [items] = await pool.query('SELECT COUNT(*) AS count FROM menu_items WHERE category_id = ?', [id]);
    if (items[0].count > 0) {
      return res.status(409).json(
        errorResponse(`Cannot delete category "${existing[0].name}" because it contains ${items[0].count} menu item(s). Reassign or delete those items first.`)
      );
    }

    await pool.query('DELETE FROM categories WHERE id = ?', [id]);

    return res.status(200).json(successResponse(null, 'Category deleted successfully.'));
  } catch (error) {
    console.error('Delete category error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

module.exports = router;
