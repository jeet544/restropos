const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize, normalizeRole } = require('../middleware/auth');
const { checkRequired, isPositiveNumber, isPositiveInteger } = require('../middleware/validate');
const { successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

// All menu routes require authentication
router.use(authenticate);

/**
 * GET /api/menu
 * List all menu items with category info.
 * Supports: ?category_id=X, ?search=term, ?available=true
 */
router.get('/', async (req, res) => {
  try {
    let query = `
      SELECT mi.*, c.name AS category_name
      FROM menu_items mi
      JOIN categories c ON mi.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (req.query.category_id) {
      query += ' AND mi.category_id = ?';
      params.push(req.query.category_id);
    }

    if (req.query.search) {
      query += ' AND mi.name LIKE ?';
      params.push(`%${req.query.search}%`);
    }

    if (req.query.available !== undefined) {
      const available = req.query.available === 'true' || req.query.available === '1';
      query += ' AND mi.available = ?';
      params.push(available);
    }

    query += ' ORDER BY c.name ASC, mi.name ASC';

    const [items] = await pool.query(query, params);

    return res.status(200).json(successResponse(items));
  } catch (error) {
    console.error('List menu items error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * GET /api/menu/:id
 * Get a single menu item
 */
router.get('/:id', async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT mi.*, c.name AS category_name
       FROM menu_items mi
       JOIN categories c ON mi.category_id = c.id
       WHERE mi.id = ?`,
      [req.params.id]
    );

    if (items.length === 0) {
      return res.status(404).json(errorResponse('Menu item not found.'));
    }

    return res.status(200).json(successResponse(items[0]));
  } catch (error) {
    console.error('Get menu item error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * POST /api/menu
 * Create a new menu item (ADMIN and MANAGER only).
 * Attributes: name, description, price, category_id, prep_time_minutes, available.
 */
router.post('/', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { name, description, price, category_id, available, prep_time_minutes } = req.body;

    const missing = checkRequired(req.body, ['name', 'price', 'category_id']);
    if (missing.length > 0) {
      return res.status(400).json(errorResponse(`Missing required fields: ${missing.join(', ')}`));
    }

    if (!isPositiveNumber(price)) {
      return res.status(400).json(errorResponse('Price must be a positive number.'));
    }

    if (!isPositiveInteger(category_id)) {
      return res.status(400).json(errorResponse('Invalid category ID.'));
    }

    // Verify category exists
    const [category] = await pool.query(
      'SELECT id FROM categories WHERE id = ?',
      [category_id]
    );
    if (category.length === 0) {
      return res.status(400).json(errorResponse('Category not found.'));
    }

    const isAvailable = available !== undefined ? Boolean(available) : true;
    const prepTime = prep_time_minutes ? parseInt(prep_time_minutes, 10) : 15;
    const desc = description ? description.trim() : null;

    const [result] = await pool.query(
      'INSERT INTO menu_items (category_id, name, description, price, available, prep_time_minutes) VALUES (?, ?, ?, ?, ?, ?)',
      [category_id, name.trim(), desc, parseFloat(price), isAvailable, prepTime]
    );

    const [newItem] = await pool.query(
      `SELECT mi.*, c.name AS category_name
       FROM menu_items mi
       JOIN categories c ON mi.category_id = c.id
       WHERE mi.id = ?`,
      [result.insertId]
    );

    return res.status(201).json(successResponse(newItem[0], 'Menu item created successfully.'));
  } catch (error) {
    console.error('Create menu item error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * PUT /api/menu/:id
 * Update a menu item.
 * - Admin and Manager can update everything (name, price, category, prep time).
 * - Chef can ONLY toggle availability (86 out-of-stock items), but cannot edit prices or names.
 * - Waiters and Cashiers are restricted.
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category_id, available, prep_time_minutes } = req.body;
    const userRole = req.user.canonicalRole || normalizeRole(req.user.role);

    // Check item exists
    const [existing] = await pool.query(
      'SELECT id FROM menu_items WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json(errorResponse('Menu item not found.'));
    }

    const isPriceOrDetailsUpdate = (
      name !== undefined ||
      price !== undefined ||
      category_id !== undefined ||
      description !== undefined ||
      prep_time_minutes !== undefined
    );

    // If updating price or core item fields, must be ADMIN or MANAGER
    if (isPriceOrDetailsUpdate) {
      if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        return res.status(403).json(
          errorResponse(`Forbidden: Role "${userRole}" cannot modify menu prices or item details. Only Admin and Manager are authorized.`)
        );
      }
    } else if (available !== undefined) {
      // Only updating availability: allowed for ADMIN, MANAGER, CHEF
      if (!['ADMIN', 'MANAGER', 'CHEF'].includes(userRole)) {
        return res.status(403).json(
          errorResponse(`Forbidden: Role "${userRole}" cannot change item availability.`)
        );
      }
    }

    // Build update fields dynamically
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description ? description.trim() : null);
    }

    if (price !== undefined) {
      if (!isPositiveNumber(price)) {
        return res.status(400).json(errorResponse('Price must be a positive number.'));
      }
      updates.push('price = ?');
      params.push(parseFloat(price));
    }

    if (category_id !== undefined) {
      if (!isPositiveInteger(category_id)) {
        return res.status(400).json(errorResponse('Invalid category ID.'));
      }
      const [category] = await pool.query(
        'SELECT id FROM categories WHERE id = ?',
        [category_id]
      );
      if (category.length === 0) {
        return res.status(400).json(errorResponse('Category not found.'));
      }
      updates.push('category_id = ?');
      params.push(category_id);
    }

    if (prep_time_minutes !== undefined) {
      updates.push('prep_time_minutes = ?');
      params.push(parseInt(prep_time_minutes, 10));
    }

    if (available !== undefined) {
      updates.push('available = ?');
      params.push(Boolean(available));
    }

    if (updates.length === 0) {
      return res.status(400).json(errorResponse('No fields to update.'));
    }

    params.push(id);
    await pool.query(
      `UPDATE menu_items SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [updated] = await pool.query(
      `SELECT mi.*, c.name AS category_name
       FROM menu_items mi
       JOIN categories c ON mi.category_id = c.id
       WHERE mi.id = ?`,
      [id]
    );

    return res.status(200).json(successResponse(updated[0], 'Menu item updated successfully.'));
  } catch (error) {
    console.error('Update menu item error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * DELETE /api/menu/:id
 * Delete a menu item (ADMIN only).
 */
router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT id, name FROM menu_items WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json(errorResponse('Menu item not found.'));
    }

    // Check for references in order_items
    const [orderItems] = await pool.query(
      'SELECT COUNT(*) AS count FROM order_items WHERE item_id = ?',
      [id]
    );
    if (orderItems[0].count > 0) {
      return res.status(409).json(
        errorResponse(
          `Cannot delete "${existing[0].name}" because it is referenced in ${orderItems[0].count} order(s). Consider marking it as unavailable instead.`
        )
      );
    }

    await pool.query('DELETE FROM menu_items WHERE id = ?', [id]);

    return res.status(200).json(successResponse(null, 'Menu item deleted successfully.'));
  } catch (error) {
    console.error('Delete menu item error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

module.exports = router;
