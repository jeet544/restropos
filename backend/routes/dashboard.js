const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticate);

/**
 * GET /api/dashboard/stats
 * Returns aggregated dashboard statistics from database
 * Query: ?date=YYYY-MM-DD (defaults to current date)
 */
router.get('/stats', async (req, res) => {
  try {
    const targetDate = req.query.date || null;
    const dateCondition = targetDate ? 'DATE(created_at) = ?' : 'DATE(created_at) = CURDATE()';
    const queryParams = targetDate ? [targetDate] : [];

    // Today's sales (sum of completed orders today)
    const [salesResult] = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS todaySales
       FROM orders
       WHERE UPPER(status) = 'COMPLETED' AND ${dateCondition}`,
      queryParams
    );

    // Total orders today
    const [totalOrdersResult] = await pool.query(
      `SELECT COUNT(*) AS totalOrders
       FROM orders
       WHERE ${dateCondition}`,
      queryParams
    );

    // Orders by status
    const [ordersByStatus] = await pool.query(
      `SELECT
         SUM(CASE WHEN UPPER(status) IN ('PENDING', 'PREPARING', 'READY', 'SERVED') THEN 1 ELSE 0 END) AS activeOrders,
         SUM(CASE WHEN UPPER(status) = 'PENDING' THEN 1 ELSE 0 END) AS pendingOrders,
         SUM(CASE WHEN UPPER(status) = 'PREPARING' THEN 1 ELSE 0 END) AS preparingOrders,
         SUM(CASE WHEN UPPER(status) = 'READY' THEN 1 ELSE 0 END) AS readyOrders,
         SUM(CASE WHEN UPPER(status) = 'SERVED' THEN 1 ELSE 0 END) AS servedOrders,
         SUM(CASE WHEN UPPER(status) = 'COMPLETED' THEN 1 ELSE 0 END) AS completedOrders,
         SUM(CASE WHEN UPPER(status) = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelledOrders
       FROM orders
       WHERE ${dateCondition}`,
      queryParams
    );

    // Table stats
    const [tableStats] = await pool.query(
      `SELECT
         COUNT(*) AS totalTables,
         SUM(CASE WHEN UPPER(status) = 'AVAILABLE' THEN 1 ELSE 0 END) AS availableTables,
         SUM(CASE WHEN UPPER(status) = 'OCCUPIED' THEN 1 ELSE 0 END) AS occupiedTables,
         SUM(CASE WHEN UPPER(status) = 'RESERVED' THEN 1 ELSE 0 END) AS reservedTables,
         SUM(CASE WHEN UPPER(status) IN ('CLEANING', 'OUT_OF_SERVICE') THEN 1 ELSE 0 END) AS cleaningTables
       FROM restaurant_tables`
    );

    const stats = {
      todaySales: parseFloat(salesResult[0].todaySales || 0),
      totalOrders: totalOrdersResult[0].totalOrders || 0,
      activeOrders: ordersByStatus[0].activeOrders || 0,
      pendingOrders: ordersByStatus[0].pendingOrders || 0,
      preparingOrders: ordersByStatus[0].preparingOrders || 0,
      readyOrders: ordersByStatus[0].readyOrders || 0,
      completedOrders: ordersByStatus[0].completedOrders || 0,
      cancelledOrders: ordersByStatus[0].cancelledOrders || 0,
      availableTables: tableStats[0].availableTables || 0,
      occupiedTables: tableStats[0].occupiedTables || 0,
      reservedTables: tableStats[0].reservedTables || 0,
      cleaningTables: tableStats[0].cleaningTables || 0,
      totalTables: tableStats[0].totalTables || 0,
    };

    return res.status(200).json(successResponse(stats));
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * GET /api/dashboard/recent-orders
 * Returns the last 10 orders with their items
 */
router.get('/recent-orders', async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, u.name AS user_name, rt.table_number
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
       ORDER BY o.created_at DESC
       LIMIT 10`
    );

    // Fetch order items for each order
    const orderIds = orders.map((o) => o.id);

    if (orderIds.length > 0) {
      const [items] = await pool.query(
        `SELECT oi.*, mi.name AS item_name
         FROM order_items oi
         JOIN menu_items mi ON oi.item_id = mi.id
         WHERE oi.order_id IN (?)`,
        [orderIds]
      );

      // Group items by order_id
      const itemsByOrder = {};
      for (const item of items) {
        if (!itemsByOrder[item.order_id]) {
          itemsByOrder[item.order_id] = [];
        }
        itemsByOrder[item.order_id].push(item);
      }

      // Attach items to orders
      for (const order of orders) {
        order.items = itemsByOrder[order.id] || [];
      }
    }

    return res.status(200).json(successResponse(orders));
  } catch (error) {
    console.error('Recent orders error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

module.exports = router;
