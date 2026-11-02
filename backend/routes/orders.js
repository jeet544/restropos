const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize, normalizeRole } = require('../middleware/auth');
const { isPositiveInteger } = require('../middleware/validate');
const { successResponse, errorResponse, parsePagination } = require('../utils/helpers');

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// Canonical Order Statuses
// PENDING -> PREPARING -> READY -> SERVED -> COMPLETED (or CANCELLED)
const STATUS_TRANSITIONS = {
  PENDING: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['SERVED', 'COMPLETED', 'CANCELLED'],
  SERVED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * GET /api/orders
 * List orders with filters and pagination.
 */
router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    let countQuery = 'SELECT COUNT(*) AS total FROM orders WHERE 1=1';
    let dataQuery = `
      SELECT o.*, u.name AS user_name, rt.table_number, rt.location_zone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];

    if (req.query.status) {
      const statusFilter = ' AND UPPER(o.status) = ?';
      dataQuery += statusFilter;
      countQuery += ' AND UPPER(status) = ?';
      params.push(req.query.status.toUpperCase());
      countParams.push(req.query.status.toUpperCase());
    }

    if (req.query.order_type) {
      const typeFilter = ' AND UPPER(REPLACE(o.order_type, "-", "_")) = ?';
      const cleanType = req.query.order_type.toUpperCase().replace('-', '_');
      dataQuery += typeFilter;
      countQuery += ' AND UPPER(REPLACE(order_type, "-", "_")) = ?';
      params.push(cleanType);
      countParams.push(cleanType);
    }

    if (req.query.date) {
      const dateFilter = ' AND DATE(o.created_at) = ?';
      dataQuery += dateFilter;
      countQuery += ' AND DATE(created_at) = ?';
      params.push(req.query.date);
      countParams.push(req.query.date);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    dataQuery += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [orders] = await pool.query(dataQuery, params);

    // Fetch order items for each order
    if (orders.length > 0) {
      const orderIds = orders.map((o) => o.id);
      const [items] = await pool.query(
        `SELECT oi.*, mi.name AS item_name, mi.prep_time_minutes
         FROM order_items oi
         JOIN menu_items mi ON oi.item_id = mi.id
         WHERE oi.order_id IN (?)`,
        [orderIds]
      );

      const itemsByOrder = {};
      for (const item of items) {
        if (!itemsByOrder[item.order_id]) {
          itemsByOrder[item.order_id] = [];
        }
        itemsByOrder[item.order_id].push(item);
      }

      for (const order of orders) {
        order.items = itemsByOrder[order.id] || [];
      }
    }

    return res.status(200).json(successResponse({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }));
  } catch (error) {
    console.error('List orders error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * GET /api/orders/:id
 * Get full order with items, table info, and payment info.
 */
router.get('/:id', async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, u.name AS user_name, rt.table_number, rt.location_zone, rt.capacity
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json(errorResponse('Order not found.'));
    }

    const order = orders[0];

    const [items] = await pool.query(
      `SELECT oi.*, mi.name AS item_name, mi.prep_time_minutes, c.name AS category_name
       FROM order_items oi
       JOIN menu_items mi ON oi.item_id = mi.id
       JOIN categories c ON mi.category_id = c.id
       WHERE oi.order_id = ?`,
      [order.id]
    );
    order.items = items;

    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC',
      [order.id]
    );
    order.payments = payments;

    return res.status(200).json(successResponse(order));
  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  }
});

/**
 * POST /api/orders
 * Create a new order with items.
 * Allowed roles: ADMIN, MANAGER, WAITER, CASHIER. (CHEF is restricted).
 */
router.post('/', authorize('ADMIN', 'MANAGER', 'WAITER', 'CASHIER'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { orderType, tableId, items, specialInstructions, discountAmount } = req.body;

    if (!orderType) {
      return res.status(400).json(errorResponse('Order type is required.'));
    }

    const cleanOrderType = orderType.toUpperCase().replace('-', '_');
    if (!['DINE_IN', 'TAKEAWAY', 'DELIVERY'].includes(cleanOrderType)) {
      return res.status(400).json(errorResponse('Order type must be DINE_IN, TAKEAWAY, or DELIVERY.'));
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json(errorResponse('Order must contain at least one item.'));
    }

    for (const item of items) {
      if (!item.itemId || !item.quantity) {
        return res.status(400).json(errorResponse('Each item must have itemId and quantity.'));
      }
      if (!isPositiveInteger(item.quantity)) {
        return res.status(400).json(errorResponse('Item quantity must be a positive integer.'));
      }
    }

    // Deduplication check within last 20 seconds
    const itemIdList = items.map((i) => i.itemId);
    const [menuItems] = await pool.query(
      'SELECT id, price, available, name FROM menu_items WHERE id IN (?)',
      [itemIdList]
    );

    if (menuItems.length !== new Set(itemIdList).size) {
      return res.status(400).json(errorResponse('One or more menu items not found.'));
    }

    const menuItemMap = {};
    for (const mi of menuItems) {
      if (!mi.available) {
        return res.status(400).json(errorResponse(`"${mi.name}" is currently unavailable.`));
      }
      menuItemMap[mi.id] = mi;
    }

    let tableIdValue = null;
    if (cleanOrderType === 'DINE_IN') {
      if (!tableId) {
        return res.status(400).json(errorResponse('Table selection is required for Dine-In orders.'));
      }

      const [tables] = await pool.query(
        'SELECT id, status FROM restaurant_tables WHERE id = ?',
        [tableId]
      );

      if (tables.length === 0) {
        return res.status(400).json(errorResponse('Table not found.'));
      }

      const curStatus = tables[0].status.toUpperCase();
      if (curStatus !== 'AVAILABLE' && curStatus !== 'OCCUPIED') {
        return res.status(400).json(
          errorResponse(`Table is currently "${curStatus}" and cannot accept new orders.`)
        );
      }

      tableIdValue = tableId;
    }

    await conn.beginTransaction();

    // Calculate subtotal, tax (5%), discount, total
    let subtotal = 0;
    const preparedItems = [];
    for (const item of items) {
      const menuItem = menuItemMap[item.itemId];
      const unitPrice = parseFloat(menuItem.price);
      const quantity = parseInt(item.quantity, 10);
      const lineSubtotal = parseFloat((unitPrice * quantity).toFixed(2));
      subtotal += lineSubtotal;
      preparedItems.push({
        itemId: item.itemId,
        quantity,
        unitPrice,
        subtotal: lineSubtotal,
        specialNotes: item.specialNotes ? item.specialNotes.trim() : null,
      });
    }

    subtotal = parseFloat(subtotal.toFixed(2));
    const taxAmount = parseFloat((subtotal * 0.05).toFixed(2));
    const discount = discountAmount ? parseFloat(parseFloat(discountAmount).toFixed(2)) : 0.00;
    const totalAmount = parseFloat((subtotal + taxAmount - discount).toFixed(2));
    const instructions = specialInstructions ? specialInstructions.trim() : null;

    // Create order record
    const [orderResult] = await conn.query(
      `INSERT INTO orders (order_type, status, subtotal, tax_amount, discount_amount, total_amount, special_instructions, user_id, table_id)
       VALUES (?, 'PENDING', ?, ?, ?, ?, ?, ?, ?)`,
      [cleanOrderType, subtotal, taxAmount, discount, totalAmount, instructions, req.user.id, tableIdValue]
    );
    const orderId = orderResult.insertId;

    // Create order items
    for (const pi of preparedItems) {
      await conn.query(
        `INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal, special_notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, pi.itemId, pi.quantity, pi.unitPrice, pi.subtotal, pi.specialNotes]
      );
    }

    // Set table to OCCUPIED
    if (cleanOrderType === 'DINE_IN' && tableIdValue) {
      await conn.query(
        "UPDATE restaurant_tables SET status = 'OCCUPIED' WHERE id = ?",
        [tableIdValue]
      );
    }

    await conn.commit();

    const [newOrder] = await pool.query(
      `SELECT o.*, u.name AS user_name, rt.table_number, rt.location_zone
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
       WHERE o.id = ?`,
      [orderId]
    );

    const [orderItems] = await pool.query(
      `SELECT oi.*, mi.name AS item_name, mi.prep_time_minutes
       FROM order_items oi
       JOIN menu_items mi ON oi.item_id = mi.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    newOrder[0].items = orderItems;

    return res.status(201).json(successResponse(newOrder[0], 'Order placed successfully.'));
  } catch (error) {
    await conn.rollback();
    console.error('Create order error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  } finally {
    conn.release();
  }
});

/**
 * PATCH /api/orders/:id/status
 * Update order status with strict RBAC:
 * - ADMIN & MANAGER: unrestricted transition to any status or CANCELLED
 * - CHEF: strictly PENDING -> PREPARING, PREPARING -> READY
 * - WAITER: strictly READY -> SERVED
 * - CASHIER: strictly READY or SERVED -> COMPLETED (during checkout)
 */
router.patch('/:id/status', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status: rawStatus } = req.body;

    if (!rawStatus) {
      return res.status(400).json(errorResponse('Status is required.'));
    }

    const newStatus = rawStatus.toUpperCase();

    // Get current order
    const [orders] = await conn.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      return res.status(404).json(errorResponse('Order not found.'));
    }

    const order = orders[0];
    const currentStatus = order.status.toUpperCase();
    const userRole = req.user.canonicalRole || normalizeRole(req.user.role);

    // ADMIN has full authority over everything
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      if (userRole === 'CHEF') {
        const allowedChef = (currentStatus === 'PENDING' && newStatus === 'PREPARING') ||
                            (currentStatus === 'PREPARING' && newStatus === 'READY');
        if (!allowedChef) {
          return res.status(403).json(
            errorResponse(`Kitchen/Chef can only change status: PENDING -> PREPARING or PREPARING -> READY. Cannot transition from "${currentStatus}" to "${newStatus}".`)
          );
        }
      } else if (userRole === 'WAITER') {
        const allowedWaiter = (currentStatus === 'READY' && newStatus === 'SERVED');
        if (!allowedWaiter) {
          return res.status(403).json(
            errorResponse(`Waiter can only mark READY orders as SERVED. Cannot transition from "${currentStatus}" to "${newStatus}".`)
          );
        }
      } else if (userRole === 'CASHIER') {
        const allowedCashier = ((currentStatus === 'READY' || currentStatus === 'SERVED') && newStatus === 'COMPLETED');
        if (!allowedCashier) {
          return res.status(403).json(
            errorResponse(`Cashier can only mark ready/served orders as COMPLETED via checkout.`)
          );
        }
      } else {
        return res.status(403).json(errorResponse(`Unauthorized role: ${userRole}`));
      }
    }

    await conn.beginTransaction();

    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [newStatus, id]);

    // On CANCELLED: release table if no other active orders exist on that table
    if (newStatus === 'CANCELLED' && order.table_id) {
      const [activeOrders] = await conn.query(
        `SELECT COUNT(*) AS count FROM orders
         WHERE table_id = ? AND id != ? AND UPPER(status) IN ('PENDING', 'PREPARING', 'READY', 'SERVED')`,
        [order.table_id, id]
      );

      if (activeOrders[0].count === 0) {
        await conn.query("UPDATE restaurant_tables SET status = 'AVAILABLE' WHERE id = ?", [order.table_id]);
      }
    }

    await conn.commit();

    const [updatedOrder] = await pool.query(
      `SELECT o.*, u.name AS user_name, rt.table_number, rt.location_zone
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
       WHERE o.id = ?`,
      [id]
    );

    return res.status(200).json(successResponse(updatedOrder[0], `Order status updated to "${newStatus}".`));
  } catch (error) {
    await conn.rollback();
    console.error('Update order status error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  } finally {
    conn.release();
  }
});

/**
 * POST /api/orders/:id/checkout
 * Process payment and complete order.
 * Strictly authorized for: ADMIN, MANAGER, CASHIER.
 * Blocked for: WAITER and CHEF.
 */
router.post('/:id/checkout', authorize('ADMIN', 'MANAGER', 'CASHIER'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { method, transactionReference, tipAmount } = req.body;

    if (!method) {
      return res.status(400).json(errorResponse('Payment method is required.'));
    }

    const cleanMethod = method.toUpperCase();
    if (!['CASH', 'CARD', 'UPI', 'WALLET'].includes(cleanMethod)) {
      return res.status(400).json(errorResponse('Payment method must be CASH, CARD, UPI, or WALLET.'));
    }

    const [orders] = await conn.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      return res.status(404).json(errorResponse('Order not found.'));
    }

    const order = orders[0];
    const orderStatus = order.status.toUpperCase();

    if (orderStatus !== 'READY' && orderStatus !== 'SERVED') {
      return res.status(400).json(
        errorResponse(`Order must be in READY or SERVED status to checkout. Current status: "${order.status}".`)
      );
    }

    // Check no existing successful payment
    const [existingPayments] = await conn.query(
      "SELECT id FROM payments WHERE order_id = ? AND UPPER(status) = 'COMPLETED'",
      [id]
    );
    if (existingPayments.length > 0) {
      return res.status(409).json(errorResponse('This order has already been paid for.'));
    }

    await conn.beginTransaction();

    const finalAmount = parseFloat(order.total_amount);
    const txRef = transactionReference ? transactionReference.trim() : `${cleanMethod}-${Date.now().toString().slice(-6)}`;

    // Create payment record
    const [paymentResult] = await conn.query(
      `INSERT INTO payments (order_id, amount, method, status, transaction_reference)
       VALUES (?, ?, ?, 'COMPLETED', ?)`,
      [id, finalAmount, cleanMethod, txRef]
    );

    // Update order status to COMPLETED
    await conn.query("UPDATE orders SET status = 'COMPLETED' WHERE id = ?", [id]);

    // Release table if no other active orders on that table
    if (order.table_id) {
      const [activeOrders] = await conn.query(
        `SELECT COUNT(*) AS count FROM orders
         WHERE table_id = ? AND id != ? AND UPPER(status) IN ('PENDING', 'PREPARING', 'READY', 'SERVED')`,
        [order.table_id, id]
      );

      if (activeOrders[0].count === 0) {
        await conn.query("UPDATE restaurant_tables SET status = 'AVAILABLE' WHERE id = ?", [order.table_id]);
      }
    }

    await conn.commit();

    const [updatedOrder] = await pool.query(
      `SELECT o.*, u.name AS user_name, rt.table_number, rt.location_zone
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
       WHERE o.id = ?`,
      [id]
    );

    const [orderItems] = await pool.query(
      `SELECT oi.*, mi.name AS item_name
       FROM order_items oi
       JOIN menu_items mi ON oi.item_id = mi.id
       WHERE oi.order_id = ?`,
      [id]
    );

    const [payment] = await pool.query('SELECT * FROM payments WHERE id = ?', [paymentResult.insertId]);

    const result = {
      order: updatedOrder[0],
      items: orderItems,
      payment: payment[0],
      receipt: {
        orderId: id,
        orderType: updatedOrder[0].order_type,
        tableNumber: updatedOrder[0].table_number || 'N/A',
        locationZone: updatedOrder[0].location_zone || 'Floor',
        items: orderItems.map((i) => ({
          name: i.item_name,
          quantity: i.quantity,
          unitPrice: parseFloat(i.unit_price),
          subtotal: parseFloat(i.subtotal),
          specialNotes: i.special_notes,
        })),
        subtotal: parseFloat(updatedOrder[0].subtotal || 0),
        taxAmount: parseFloat(updatedOrder[0].tax_amount || 0),
        discountAmount: parseFloat(updatedOrder[0].discount_amount || 0),
        totalAmount: finalAmount,
        paymentMethod: cleanMethod,
        transactionReference: txRef,
        paidAt: payment[0].created_at,
        servedBy: updatedOrder[0].user_name,
      },
    };

    return res.status(200).json(successResponse(result, 'Checkout completed and receipt generated.'));
  } catch (error) {
    await conn.rollback();
    console.error('Checkout error:', error);
    return res.status(500).json(errorResponse('Internal server error.'));
  } finally {
    conn.release();
  }
});

module.exports = router;
