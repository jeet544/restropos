const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Normalizes role string to canonical uppercase role.
 * Maps legacy role names: 'staff' -> 'WAITER', 'kitchen' -> 'CHEF'.
 */
const normalizeRole = (role) => {
  if (!role) return '';
  const r = role.toString().toUpperCase().trim();
  if (r === 'STAFF') return 'WAITER';
  if (r === 'KITCHEN') return 'CHEF';
  return r;
};

/**
 * Verify JWT from Authorization Bearer header and attach user to req.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from DB to ensure they still exist and get latest role
    const [rows] = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.',
      });
    }

    req.user = rows[0];
    req.user.canonicalRole = normalizeRole(rows[0].role);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * Check if req.user.role is authorized.
 * ADMIN has unrestricted access over everything.
 * Accepts any combination of uppercase/lowercase roles and synonyms.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userCanonicalRole = req.user.canonicalRole || normalizeRole(req.user.role);

    // ADMIN has absolute access over every single resource in the website
    if (userCanonicalRole === 'ADMIN') {
      return next();
    }

    const normalizedAllowed = allowedRoles.map(r => normalizeRole(r));

    if (!normalizedAllowed.includes(userCanonicalRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role "${userCanonicalRole}" does not have permission to access this resource. Required roles: ${normalizedAllowed.join(', ')}`,
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize, normalizeRole };
