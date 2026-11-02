import React, { useState, useEffect, useCallback } from 'react';
import {
  FiClock,
  FiPlay,
  FiCheckCircle,
  FiRefreshCw,
  FiAlertCircle,
  FiCoffee,
} from 'react-icons/fi';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import './Kitchen.css';

const Kitchen = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const canUpdateKitchen = ['ADMIN', 'MANAGER', 'CHEF', 'KITCHEN'].includes(role);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [lastSync, setLastSync] = useState(new Date());

  // Fetch all active kitchen orders (pending, preparing, ready)
  const fetchKitchenOrders = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);

      const [pendingRes, prepRes, readyRes] = await Promise.all([
        api.get('/orders', { params: { status: 'pending', limit: 50 } }),
        api.get('/orders', { params: { status: 'preparing', limit: 50 } }),
        api.get('/orders', { params: { status: 'ready', limit: 50 } }),
      ]);

      const pendingOrders = pendingRes.data?.data?.orders || pendingRes.data?.orders || [];
      const prepOrders = prepRes.data?.data?.orders || prepRes.data?.orders || [];
      const readyOrders = readyRes.data?.data?.orders || readyRes.data?.orders || [];

      setOrders([...pendingOrders, ...prepOrders, ...readyOrders]);
      setLastSync(new Date());
    } catch (error) {
      console.error('Kitchen sync failed:', error);
      if (!isBackground) {
        showToast('Failed to fetch kitchen orders.', 'error');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  // Initial fetch and automatic polling every 5 seconds (satisfying real-time sync requirement)
  useEffect(() => {
    fetchKitchenOrders(false);

    const interval = setInterval(() => {
      fetchKitchenOrders(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchKitchenOrders]);

  // Transition order status: Pending -> Preparing -> Ready
  const updateOrderStatus = async (orderId, targetStatus) => {
    try {
      setUpdatingId(orderId);
      await api.patch(`/orders/${orderId}/status`, { status: targetStatus });
      showToast(`Order #${orderId} moved to ${targetStatus}!`, 'success');
      // Immediate local state update for instant UI feedback
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: targetStatus } : o))
      );
    } catch (error) {
      console.error('Failed to update status:', error);
      const msg = error.response?.data?.message || 'Failed to update order status.';
      showToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Group orders by status
  const pendingList = orders.filter((o) => o.status === 'pending');
  const preparingList = orders.filter((o) => o.status === 'preparing');
  const readyList = orders.filter((o) => o.status === 'ready');

  // Format elapsed time in minutes
  const getElapsedMinutes = (dateStr) => {
    const elapsed = Math.floor((new Date() - new Date(dateStr)) / 60000);
    if (elapsed < 1) return 'Just now';
    if (elapsed === 1) return '1 min ago';
    return `${elapsed} mins ago`;
  };

  if (loading) {
    return <LoadingSpinner message="Connecting to Kitchen Display System..." />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Kitchen Display System (KDS)</h1>
          <p className="page-subtitle">
            Live incoming queue • Auto-refreshes every 5s • Last synced at{' '}
            {lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => fetchKitchenOrders(false)}>
            <FiRefreshCw />
            <span>Sync Now</span>
          </button>
        </div>
      </div>

      {/* Kitchen Kanban Columns */}
      <div className="kitchen-board">
        {/* Column 1: PENDING ORDERS */}
        <div className="kitchen-col">
          <div className="kitchen-col-header">
            <span className="kitchen-col-title" style={{ color: '#60a5fa' }}>
              <FiClock />
              <span>Pending</span>
            </span>
            <span className="badge badge-pending">{pendingList.length}</span>
          </div>

          <div className="kitchen-cards-container">
            {pendingList.length === 0 ? (
              <EmptyState title="No pending orders" message="New tickets from POS will appear here." />
            ) : (
              pendingList.map((order) => (
                <div key={order.id} className="kitchen-ticket pending">
                  <div className="ticket-header">
                    <div>
                      <div className="ticket-num">#{order.id}</div>
                      <div className="ticket-meta">
                        {order.order_type === 'dine-in'
                          ? `🍽️ Dine-In (Table #${order.table_number || '?'})`
                          : '🛍️ Takeaway'}
                      </div>
                    </div>
                    <div className="ticket-elapsed">
                      <FiClock size={12} />
                      <span>{getElapsedMinutes(order.created_at)}</span>
                    </div>
                  </div>

                  <div className="ticket-items-list">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="ticket-item-row">
                        <span className="ticket-item-qty">{item.quantity}</span>
                        <span className="ticket-item-name">
                          {item.item_name}
                          {item.special_notes && (
                            <span style={{ fontSize: '11px', color: '#f59e0b', display: 'block', fontStyle: 'italic' }}>
                              Note: {item.special_notes}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.special_instructions && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', margin: '8px 0', fontWeight: 600 }}>
                      ⚠️ {order.special_instructions}
                    </div>
                  )}

                  <div className="ticket-actions">
                    {canUpdateKitchen ? (
                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '10px' }}
                        onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                        disabled={updatingId === order.id}
                      >
                        <FiPlay size={14} />
                        <span>{updatingId === order.id ? 'Starting...' : 'Start Preparing'}</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chef Only Control</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: PREPARING ORDERS */}
        <div className="kitchen-col">
          <div className="kitchen-col-header">
            <span className="kitchen-col-title" style={{ color: '#fbbf24' }}>
              <FiCoffee />
              <span>Preparing</span>
            </span>
            <span className="badge badge-preparing">{preparingList.length}</span>
          </div>

          <div className="kitchen-cards-container">
            {preparingList.length === 0 ? (
              <EmptyState title="Kitchen is clear" message="No orders currently on the stove or counter." />
            ) : (
              preparingList.map((order) => (
                <div key={order.id} className="kitchen-ticket preparing">
                  <div className="ticket-header">
                    <div>
                      <div className="ticket-num">#{order.id}</div>
                      <div className="ticket-meta">
                        {order.order_type === 'dine-in'
                          ? `🍽️ Dine-In (Table #${order.table_number || '?'})`
                          : '🛍️ Takeaway'}
                      </div>
                    </div>
                    <div className="ticket-elapsed" style={{ color: '#fbbf24' }}>
                      <FiClock size={12} />
                      <span>{getElapsedMinutes(order.created_at)}</span>
                    </div>
                  </div>

                  <div className="ticket-items-list">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="ticket-item-row">
                        <span className="ticket-item-qty" style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                          {item.quantity}
                        </span>
                        <span className="ticket-item-name">
                          {item.item_name}
                          {item.special_notes && (
                            <span style={{ fontSize: '11px', color: '#f59e0b', display: 'block', fontStyle: 'italic' }}>
                              Note: {item.special_notes}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.special_instructions && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', margin: '8px 0', fontWeight: 600 }}>
                      ⚠️ {order.special_instructions}
                    </div>
                  )}

                  <div className="ticket-actions">
                    {canUpdateKitchen ? (
                      <button
                        className="btn btn-success"
                        style={{ width: '100%', padding: '10px' }}
                        onClick={() => updateOrderStatus(order.id, 'READY')}
                        disabled={updatingId === order.id}
                      >
                        <FiCheckCircle size={14} />
                        <span>{updatingId === order.id ? 'Updating...' : 'Mark as Ready'}</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chef Only Control</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: READY FOR PICKUP / CASHIER */}
        <div className="kitchen-col">
          <div className="kitchen-col-header">
            <span className="kitchen-col-title" style={{ color: '#34d399' }}>
              <FiCheckCircle />
              <span>Ready for Service</span>
            </span>
            <span className="badge badge-ready">{readyList.length}</span>
          </div>

          <div className="kitchen-cards-container">
            {readyList.length === 0 ? (
              <EmptyState title="No orders waiting" message="Cooked dishes ready for serving will wait here." />
            ) : (
              readyList.map((order) => (
                <div key={order.id} className="kitchen-ticket ready">
                  <div className="ticket-header">
                    <div>
                      <div className="ticket-num">#{order.id}</div>
                      <div className="ticket-meta">
                        {order.order_type === 'dine-in'
                          ? `🍽️ Dine-In (Table #${order.table_number || '?'})`
                          : '🛍️ Takeaway (Counter Pickup)'}
                      </div>
                    </div>
                    <span className="badge badge-ready">Ready</span>
                  </div>

                  <div className="ticket-items-list">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="ticket-item-row">
                        <span className="ticket-item-qty" style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
                          {item.quantity}
                        </span>
                        <span className="ticket-item-name">{item.item_name}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ textAlign: 'center', padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', fontSize: '12px', color: '#34d399', fontWeight: 600 }}>
                    🔔 Notified Cashier for payment & serving
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Kitchen;
