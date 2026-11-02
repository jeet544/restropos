const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { successResponse, errorResponse, parsePagination } = require('../utils/helpers');

const router = express.Router();

// All payment routes require authentication and admin/cashier role
router.use(authenticate);
router.use(authorize('admin', 'cashier'));

/**
 * GET /api/payments
 * List payments with order info.
 * Filters: ?date=YYYY-MM-DD, ?method=cash
 * Pagination: ?page=1&limit=20
 */
router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    let countQuery = 'SELECT COUNT(*) AS total FROM payments p WHERE 1=1';
    let dataQuery = `
      SELECT p.*, o.order_type, o.status AS order_status, o.total_amount AS order_total,
             o.table_id, rt.table_number, u.name AS user_name
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];

    if (req.query.date) {
      dataQuery += ' AND DATE(p.created_at) = ?';
      countQuery += ' AND DATE(p.created_at) = ?';
      params.push(req.query.date);
      countParams.push(req.query.date);
    }

    if (req.query.method) {
      dataQuery += ' AND p.method = ?';
      countQuery += ' AND p.method = ?';
      params.push(req.query.method);
      countParams.push(req.query.method);
    }

    // Get total count
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    // Get paginated data
    dataQuery += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [payments] = await pool.query(dataQuery, params);

    return res.status(200).json(successResponse({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }));
  } catch (error) {
    console.error('List payments error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * GET /api/payments/:id
 * Get a single payment with order details
 */
router.get('/:id', async (req, res) => {
  try {
    const [payments] = await pool.query(
      `SELECT p.*, o.order_type, o.status AS order_status, o.total_amount AS order_total,
              o.table_id, rt.table_number, u.name AS user_name
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
       LEFT JOIN users u ON o.user_id = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (payments.length === 0) {
      return res.status(404).json(errorResponse('Payment not found.'));
    }

    const payment = payments[0];

    // Get order items
    const [orderItems] = await pool.query(
      `SELECT oi.*, mi.name AS item_name
       FROM order_items oi
       JOIN menu_items mi ON oi.item_id = mi.id
       WHERE oi.order_id = ?`,
      [payment.order_id]
    );
    payment.order_items = orderItems;

    return res.status(200).json(successResponse(payment));
  } catch (error) {
    console.error('Get payment error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

module.exports = router;
