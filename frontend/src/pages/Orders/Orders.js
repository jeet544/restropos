import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiPlusCircle,
  FiEye,
  FiPrinter,
  FiRefreshCw,
  FiX,
  FiFilter,
} from 'react-icons/fi';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Receipt from '../../components/Receipt/Receipt';
import './Orders.css';

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Selected Order for detail modal & receipt
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.order_type = typeFilter;
      if (dateFilter) params.date = dateFilter;

      const response = await api.get('/orders', { params });
      const data = response.data?.data || response.data;
      setOrders(data.orders || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      showToast('Failed to load orders list.', 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, typeFilter, dateFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleViewDetails = async (orderId) => {
    try {
      setDetailLoading(true);
      const response = await api.get(`/orders/${orderId}`);
      setSelectedOrder(response.data?.data || response.data);
    } catch (error) {
      console.error('Failed to load order details:', error);
      showToast('Failed to fetch order details.', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      showToast(`Order #${orderId} marked as ${newStatus}.`, 'success');
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Update status error:', error);
      const msg = error.response?.data?.message || 'Failed to update order status.';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders Management</h1>
          <p className="page-subtitle">Track, filter, and review historical and live restaurant orders</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={fetchOrders} title="Refresh">
            <FiRefreshCw />
            <span>Refresh</span>
          </button>
          {['admin', 'staff'].includes(user?.role) && (
            <Link to="/orders/new" className="btn btn-primary">
              <FiPlusCircle />
              <span>New Order</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="orders-filters-bar">
        <div className="filter-group">
          <FiFilter style={{ color: 'var(--text-muted)' }} />
          <span className="filter-label">Status:</span>
          <select
            className="select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Type:</span>
          <select
            className="select"
            style={{ width: 'auto' }}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <option value="">All Types</option>
            <option value="dine-in">Dine-In</option>
            <option value="takeaway">Takeaway</option>
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Date:</span>
          <input
            type="date"
            className="input"
            style={{ width: 'auto' }}
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          />
        </div>

        {(statusFilter || typeFilter || dateFilter) && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setStatusFilter('');
              setTypeFilter('');
              setDateFilter('');
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <LoadingSpinner message="Loading orders..." />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders found"
            message="No orders match your selected filters. Try broadening your criteria."
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Table</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Placed By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const itemsCount = order.items?.reduce((s, i) => s + i.quantity, 0) || order.items?.length || 0;
                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 700 }}>#{order.id}</td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {new Date(order.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize', color: order.order_type === 'dine-in' ? '#60a5fa' : '#a78bfa' }}>
                          {order.order_type}
                        </span>
                      </td>
                      <td>{order.table_number ? `Table #${order.table_number}` : '—'}</td>
                      <td>{itemsCount} items</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>
                        ₹{Number(order.total_amount).toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge badge-${order.status}`}>{order.status}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{order.user_name || 'Staff'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleViewDetails(order.id)}
                            title="View order details"
                          >
                            <FiEye />
                            <span>Details</span>
                          </button>
                          {order.status === 'completed' && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => setReceiptOrder(order)}
                              title="Print receipt"
                            >
                              <FiPrinter />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="pagination-bar">
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Showing {orders.length} of {pagination.total} orders
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                Previous
              </button>
              <span style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--text-primary)' }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Order Details — #{selectedOrder.id}</h3>
              <button className="modal-close" onClick={() => setSelectedOrder(null)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="order-detail-grid">
                <div>
                  <div className="detail-label">Status</div>
                  <div className="detail-val">
                    <span className={`badge badge-${selectedOrder.status}`}>{selectedOrder.status}</span>
                  </div>
                </div>
                <div>
                  <div className="detail-label">Order Type</div>
                  <div className="detail-val" style={{ textTransform: 'capitalize' }}>
                    {selectedOrder.order_type}
                  </div>
                </div>
                <div>
                  <div className="detail-label">Table Number</div>
                  <div className="detail-val">
                    {selectedOrder.table_number ? `Table #${selectedOrder.table_number}` : 'None (Takeaway)'}
                  </div>
                </div>
                <div>
                  <div className="detail-label">Order Date & Time</div>
                  <div className="detail-val">
                    {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="detail-label">Served By</div>
                  <div className="detail-val">{selectedOrder.user_name || 'Staff User'}</div>
                </div>
                <div>
                  <div className="detail-label">Total Amount</div>
                  <div className="detail-val" style={{ color: '#10b981', fontSize: '16px' }}>
                    ₹{Number(selectedOrder.total_amount).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                Order Items ({selectedOrder.items?.length || 0})
              </h4>
              <div style={{ backgroundColor: 'var(--bg-input)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                <table className="data-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>₹{Number(item.unit_price).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                          ₹{Number(item.subtotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Quick status transition controls for Admin/Staff */}
              {['admin', 'staff'].includes(user?.role) && selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Admin / Staff Actions:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedOrder.status === 'pending' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleStatusChange(selectedOrder.id, 'preparing')}
                      >
                        Set to Preparing
                      </button>
                    )}
                    {selectedOrder.status === 'preparing' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleStatusChange(selectedOrder.id, 'ready')}
                      >
                        Set to Ready
                      </button>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleStatusChange(selectedOrder.id, 'cancelled')}
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {selectedOrder.status === 'completed' && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setReceiptOrder(selectedOrder);
                    setSelectedOrder(null);
                  }}
                >
                  <FiPrinter />
                  <span>Print Receipt</span>
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receiptOrder && (
        <Receipt order={receiptOrder} onClose={() => setReceiptOrder(null)} />
      )}
    </div>
  );
};

export default Orders;
