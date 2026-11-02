const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { checkRequired, isPositiveInteger } = require('../middleware/validate');
const { successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

// All table routes require authentication
router.use(authenticate);

const VALID_STATUSES = [
  'available', 'occupied', 'reserved', 'cleaning', 'out_of_service',
  'AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE'
];

/**
 * GET /api/tables
 * List all tables with status, capacity, and location zone.
 */
router.get('/', async (req, res) => {
  try {
    const [tables] = await pool.query(
      'SELECT * FROM restaurant_tables ORDER BY table_number ASC'
    );
    return res.status(200).json(successResponse(tables));
  } catch (error) {
    console.error('List tables error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * GET /api/tables/:id
 * Get a single table
 */
router.get('/:id', async (req, res) => {
  try {
    const [tables] = await pool.query(
      'SELECT * FROM restaurant_tables WHERE id = ?',
      [req.params.id]
    );

    if (tables.length === 0) {
      return res.status(404).json(errorResponse('Table not found.'));
    }

    return res.status(200).json(successResponse(tables[0]));
  } catch (error) {
    console.error('Get table error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * POST /api/tables
 * Create a new table (ADMIN and MANAGER only).
 * Attributes: table_number, capacity, location_zone, status.
 */
router.post('/', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { table_number, capacity, location_zone, status } = req.body;

    const missing = checkRequired(req.body, ['table_number']);
    if (missing.length > 0) {
      return res.status(400).json(errorResponse('Table number is required.'));
    }

    if (!isPositiveInteger(table_number)) {
      return res.status(400).json(errorResponse('Table number must be a positive integer.'));
    }

    // Check for duplicate table number
    const [existing] = await pool.query(
      'SELECT id FROM restaurant_tables WHERE table_number = ?',
      [table_number]
    );
    if (existing.length > 0) {
      return res.status(409).json(errorResponse(`Table number ${table_number} already exists.`));
    }

    const tableStatus = status ? status.toUpperCase() : 'AVAILABLE';
    const cap = capacity ? parseInt(capacity, 10) : 4;
    const zone = location_zone ? location_zone.trim() : 'Main Dining';

    const [result] = await pool.query(
      'INSERT INTO restaurant_tables (table_number, capacity, location_zone, status) VALUES (?, ?, ?, ?)',
      [table_number, cap, zone, tableStatus]
    );

    const [newTable] = await pool.query(
      'SELECT * FROM restaurant_tables WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json(successResponse(newTable[0], 'Table created successfully.'));
  } catch (error) {
    console.error('Create table error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * PUT /api/tables/:id
 * Update table details (ADMIN and MANAGER only).
 */
router.put('/:id', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { table_number, capacity, location_zone, status } = req.body;

    const [existing] = await pool.query(
      'SELECT id FROM restaurant_tables WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json(errorResponse('Table not found.'));
    }

    const updates = [];
    const params = [];

    if (table_number !== undefined) {
      if (!isPositiveInteger(table_number)) {
        return res.status(400).json(errorResponse('Table number must be a positive integer.'));
      }
      const [duplicate] = await pool.query(
        'SELECT id FROM restaurant_tables WHERE table_number = ? AND id != ?',
        [table_number, id]
      );
      if (duplicate.length > 0) {
        return res.status(409).json(errorResponse(`Table number ${table_number} already exists.`));
      }
      updates.push('table_number = ?');
      params.push(table_number);
    }

    if (capacity !== undefined) {
      updates.push('capacity = ?');
      params.push(parseInt(capacity, 10));
    }

    if (location_zone !== undefined) {
      updates.push('location_zone = ?');
      params.push(location_zone.trim());
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status.toUpperCase());
    }

    if (updates.length === 0) {
      return res.status(400).json(errorResponse('No fields to update.'));
    }

    params.push(id);
    await pool.query(
      `UPDATE restaurant_tables SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [updated] = await pool.query(
      'SELECT * FROM restaurant_tables WHERE id = ?',
      [id]
    );

    return res.status(200).json(successResponse(updated[0], 'Table updated successfully.'));
  } catch (error) {
    console.error('Update table error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * PATCH /api/tables/:id/status
 * Update table status only (ADMIN, MANAGER, WAITER, CASHIER).
 * Chefs are restricted from floor table operations.
 */
router.patch('/:id/status', authorize('ADMIN', 'MANAGER', 'WAITER', 'CASHIER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json(errorResponse('Status is required.'));
    }

    const [existing] = await pool.query(
      'SELECT id FROM restaurant_tables WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json(errorResponse('Table not found.'));
    }

    const normStatus = status.toUpperCase();

    await pool.query(
      'UPDATE restaurant_tables SET status = ? WHERE id = ?',
      [normStatus, id]
    );

    const [updated] = await pool.query(
      'SELECT * FROM restaurant_tables WHERE id = ?',
      [id]
    );

    return res.status(200).json(successResponse(updated[0], 'Table status updated successfully.'));
  } catch (error) {
    console.error('Update table status error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * DELETE /api/tables/:id
 * Delete a table (ADMIN only).
 */
router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT id, table_number FROM restaurant_tables WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json(errorResponse('Table not found.'));
    }

    // Check for active orders using this table
    const [active] = await pool.query(
      "SELECT COUNT(*) AS count FROM orders WHERE table_id = ? AND status IN ('PENDING', 'PREPARING', 'READY', 'pending', 'preparing', 'ready')",
      [id]
    );
    if (active[0].count > 0) {
      return res.status(409).json(
        errorResponse(`Cannot delete table #${existing[0].table_number} because it has active order(s).`)
      );
    }

    await pool.query('DELETE FROM restaurant_tables WHERE id = ?', [id]);

    return res.status(200).json(successResponse(null, 'Table deleted successfully.'));
  } catch (error) {
    console.error('Delete table error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

module.exports = router;
