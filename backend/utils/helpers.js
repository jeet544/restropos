/**
 * Format a decimal value to 2 decimal places.
 */
const formatCurrency = (value) => {
  return parseFloat(parseFloat(value).toFixed(2));
};

/**
 * Get today's date range in UTC for SQL queries.
 * Returns { start, end } as ISO strings for BETWEEN queries.
 */
const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return {
    start: start.toISOString().slice(0, 19).replace('T', ' '),
    end: end.toISOString().slice(0, 19).replace('T', ' '),
  };
};

/**
 * Parse pagination parameters from query string.
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Build a standardized success response.
 */
const successResponse = (data, message) => {
  const response = { success: true };
  if (message) response.message = message;
  if (data !== undefined) response.data = data;
  return response;
};

/**
 * Build a standardized error response.
 */
const errorResponse = (message) => {
  return { success: false, message };
};

module.exports = {
  formatCurrency,
  getTodayRange,
  parsePagination,
  successResponse,
  errorResponse,
};
