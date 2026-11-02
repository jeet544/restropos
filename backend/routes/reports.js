const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

// All reports routes require authentication and ADMIN or MANAGER role
router.use(authenticate);
router.use(authorize('ADMIN', 'MANAGER'));

/**
 * GET /api/reports/summary
 * Query params: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = ' AND DATE(created_at) >= ? AND DATE(created_at) <= ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = ' AND DATE(created_at) >= ?';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = ' AND DATE(created_at) <= ?';
      params.push(endDate);
    }

    // Orders summary
    const [summaryRows] = await pool.query(
      `SELECT
         COUNT(*) AS totalOrders,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) AS totalRevenue,
         COALESCE(AVG(CASE WHEN status = 'completed' THEN total_amount ELSE NULL END), 0) AS avgOrderValue,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedOrders,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledOrders,
         SUM(CASE WHEN status IN ('pending', 'preparing', 'ready') THEN 1 ELSE 0 END) AS activeOrders,
         SUM(CASE WHEN order_type = 'dine-in' THEN 1 ELSE 0 END) AS dineInOrders,
         SUM(CASE WHEN order_type = 'takeaway' THEN 1 ELSE 0 END) AS takeawayOrders
       FROM orders
       WHERE 1=1 ${dateFilter}`,
      params
    );

    // Total items sold in date range
    let itemDateFilter = '';
    const itemParams = [];
    if (startDate && endDate) {
      itemDateFilter = ' AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?';
      itemParams.push(startDate, endDate);
    }

    const [itemsSoldRow] = await pool.query(
      `SELECT COALESCE(SUM(oi.quantity), 0) AS totalItemsSold
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status = 'completed' ${itemDateFilter}`,
      itemParams
    );

    const data = {
      totalOrders: summaryRows[0].totalOrders || 0,
      totalRevenue: parseFloat(summaryRows[0].totalRevenue || 0),
      avgOrderValue: parseFloat(summaryRows[0].avgOrderValue || 0),
      completedOrders: summaryRows[0].completedOrders || 0,
      cancelledOrders: summaryRows[0].cancelledOrders || 0,
      activeOrders: summaryRows[0].activeOrders || 0,
      dineInOrders: summaryRows[0].dineInOrders || 0,
      takeawayOrders: summaryRows[0].takeawayOrders || 0,
      totalItemsSold: itemsSoldRow[0].totalItemsSold || 0,
    };

    return res.status(200).json(successResponse(data));
  } catch (error) {
    console.error('Reports summary error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * GET /api/reports/sales-by-date
 * Returns daily revenue and order counts for trend analysis
 */
router.get('/sales-by-date', async (req, res) => {
  try {
    const { startDate, endDate, days = 7 } = req.query;
    let query = `
      SELECT
        DATE(created_at) AS date,
        COUNT(*) AS totalOrders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) AS revenue,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedOrders
      FROM orders
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      query += ' AND DATE(created_at) >= ? AND DATE(created_at) <= ?';
      params.push(startDate, endDate);
    } else {
      query += ' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)';
      params.push(parseInt(days, 10) || 7);
    }

    query += ' GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC';

    const [rows] = await pool.query(query, params);

    const formatted = rows.map((r) => ({
      date: r.date,
      totalOrders: r.totalOrders,
      revenue: parseFloat(r.revenue),
      completedOrders: r.completedOrders,
    }));

    return res.status(200).json(successResponse(formatted));
  } catch (error) {
    console.error('Sales by date error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * GET /api/reports/category-breakdown
 * Category wise revenue and item quantities
 */
router.get('/category-breakdown', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT
        c.id AS category_id,
        c.name AS category_name,
        COALESCE(SUM(oi.quantity), 0) AS totalQuantity,
        COALESCE(SUM(oi.subtotal), 0) AS totalRevenue
      FROM categories c
      LEFT JOIN menu_items mi ON mi.category_id = c.id
      LEFT JOIN order_items oi ON oi.item_id = mi.id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
    `;
    const params = [];

    if (startDate && endDate) {
      query += ' AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?';
      params.push(startDate, endDate);
    }

    query += ' GROUP BY c.id, c.name ORDER BY totalRevenue DESC';

    const [rows] = await pool.query(query, params);

    const formatted = rows.map((r) => ({
      categoryId: r.category_id,
      categoryName: r.category_name,
      totalQuantity: parseInt(r.totalQuantity, 10),
      totalRevenue: parseFloat(r.totalRevenue),
    }));

    return res.status(200).json(successResponse(formatted));
  } catch (error) {
    console.error('Category breakdown error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * GET /api/reports/payment-breakdown
 * Breakdown of sales by payment method (cash, card, upi)
 */
router.get('/payment-breakdown', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT
        p.method,
        COUNT(*) AS transactionCount,
        COALESCE(SUM(p.amount), 0) AS totalAmount
      FROM payments p
      WHERE p.status = 'success'
    `;
    const params = [];

    if (startDate && endDate) {
      query += ' AND DATE(p.created_at) >= ? AND DATE(p.created_at) <= ?';
      params.push(startDate, endDate);
    }

    query += ' GROUP BY p.method ORDER BY totalAmount DESC';

    const [rows] = await pool.query(query, params);

    const formatted = rows.map((r) => ({
      method: r.method,
      count: r.transactionCount,
      amount: parseFloat(r.totalAmount),
    }));

    return res.status(200).json(successResponse(formatted));
  } catch (error) {
    console.error('Payment breakdown error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * GET /api/reports/table-utilization
 * Table utilization metrics
 */
router.get('/table-utilization', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        rt.id AS table_id,
        rt.table_number,
        rt.status AS current_status,
        COUNT(o.id) AS totalOrdersServed,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END), 0) AS totalRevenue
      FROM restaurant_tables rt
      LEFT JOIN orders o ON o.table_id = rt.id
      GROUP BY rt.id, rt.table_number, rt.status
      ORDER BY rt.table_number ASC
    `);

    const formatted = rows.map((r) => ({
      tableId: r.table_id,
      tableNumber: r.table_number,
      currentStatus: r.current_status,
      totalOrders: r.totalOrdersServed,
      revenue: parseFloat(r.totalRevenue),
    }));

    return res.status(200).json(successResponse(formatted));
  } catch (error) {
    console.error('Table utilization error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

module.exports = router;
