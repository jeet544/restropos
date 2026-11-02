import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiDollarSign,
  FiShoppingBag,
  FiLayout,
  FiClock,
  FiPlusCircle,
  FiCoffee,
  FiCheckCircle,
  FiRefreshCw,
  FiArrowRight,
} from 'react-icons/fi';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const isFinancialViewer = ['ADMIN', 'MANAGER', 'CASHIER'].includes(role);
  const canCreateOrder = ['ADMIN', 'MANAGER', 'WAITER', 'STAFF', 'CASHIER'].includes(role);
  const canViewKitchen = ['ADMIN', 'MANAGER', 'CHEF', 'KITCHEN'].includes(role);
  const canViewCashier = ['ADMIN', 'MANAGER', 'CASHIER'].includes(role);

  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard statistics from MySQL database
  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-orders'),
      ]);

      setStats(statsRes.data?.data || statsRes.data);
      setRecentOrders(ordersRes.data?.data || ordersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      showToast('Failed to load live dashboard metrics.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Operations defined in the class diagram:
  const getDailySales = () => {
    return stats ? Number(stats.todaySales || 0).toFixed(2) : '0.00';
  };

  const getOrderCount = () => {
    return stats ? stats.totalOrders || 0 : 0;
  };

  const getActiveTables = () => {
    return stats ? stats.occupiedTables || 0 : 0;
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return <LoadingSpinner message="Loading live restaurant metrics..." />;
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">Real-time overview of orders, revenue, and floor operations</p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh live data"
          >
            <FiRefreshCw className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <Link to="/orders/new" className="btn btn-primary">
            <FiPlusCircle />
            <span>New Order</span>
          </Link>
        </div>
      </div>

      {/* Top 4 Primary KPI Cards */}
      <div className="dashboard-grid">
        {isFinancialViewer ? (
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <FiDollarSign />
            </div>
            <div className="stat-info">
              <div className="stat-label">Today's Sales (getDailySales)</div>
              <div className="stat-value">₹{getDailySales()}</div>
              <div className="stat-subtext">From completed orders</div>
            </div>
          </div>
        ) : (
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <FiCheckCircle />
            </div>
            <div className="stat-info">
              <div className="stat-label">Completed Orders</div>
              <div className="stat-value">{stats?.completedOrders || 0}</div>
              <div className="stat-subtext">Successfully fulfilled today</div>
            </div>
          </div>
        )}

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <FiShoppingBag />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Orders (getOrderCount)</div>
            <div className="stat-value">{getOrderCount()}</div>
            <div className="stat-subtext">Today's dine-in & takeaway</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <FiClock />
          </div>
          <div className="stat-info">
            <div className="stat-label">Active Orders</div>
            <div className="stat-value">{stats?.activeOrders || 0}</div>
            <div className="stat-subtext">Pending + Preparing + Ready</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <FiLayout />
          </div>
          <div className="stat-info">
            <div className="stat-label">Occupied Tables (getActiveTables)</div>
            <div className="stat-value">
              {getActiveTables()} / {stats?.totalTables || 0}
            </div>
            <div className="stat-subtext">{stats?.availableTables || 0} tables available</div>
          </div>
        </div>
      </div>

      {/* Order Status Breakdown Bar */}
      <div className="status-pill-grid">
        <div className="status-pill">
          <span className="badge badge-pending">Pending</span>
          <div className="status-pill-val" style={{ color: '#60a5fa' }}>{stats?.pendingOrders || 0}</div>
        </div>
        <div className="status-pill">
          <span className="badge badge-preparing">Preparing</span>
          <div className="status-pill-val" style={{ color: '#fbbf24' }}>{stats?.preparingOrders || 0}</div>
        </div>
        <div className="status-pill">
          <span className="badge badge-ready">Ready for Pickup</span>
          <div className="status-pill-val" style={{ color: '#34d399' }}>{stats?.readyOrders || 0}</div>
        </div>
        <div className="status-pill">
          <span className="badge badge-completed">Completed</span>
          <div className="status-pill-val" style={{ color: '#10b981' }}>{stats?.completedOrders || 0}</div>
        </div>
        <div className="status-pill">
          <span className="badge badge-cancelled">Cancelled</span>
          <div className="status-pill-val" style={{ color: '#f87171' }}>{stats?.cancelledOrders || 0}</div>
        </div>
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="quick-actions-grid">
        {canCreateOrder && (
          <Link to="/orders/new" className="action-card">
            <div className="action-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <FiPlusCircle />
            </div>
            <div>
              <div className="action-title">Create Order</div>
              <div className="action-desc">Take dine-in or takeaway POS orders</div>
            </div>
          </Link>
        )}

        {canViewKitchen && (
          <Link to="/kitchen" className="action-card">
            <div className="action-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <FiCoffee />
            </div>
            <div>
              <div className="action-title">Kitchen Screen</div>
              <div className="action-desc">View ticket queue and update statuses</div>
            </div>
          </Link>
        )}

        {canViewCashier && (
          <Link to="/cashier" className="action-card">
            <div className="action-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <FiDollarSign />
            </div>
            <div>
              <div className="action-title">Cashier Checkout</div>
              <div className="action-desc">Complete payments and print receipts</div>
            </div>
          </Link>
        )}

        <Link to="/tables" className="action-card">
          <div className="action-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <FiLayout />
          </div>
          <div>
            <div className="action-title">Floor Tables</div>
            <div className="action-desc">Check table grid and room availability</div>
          </div>
        </Link>
      </div>

      {/* Recent Orders Section */}
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">Recent Order Activity</h2>
          <Link to="/orders" className="btn btn-outline btn-sm">
            <span>View All Orders</span>
            <FiArrowRight />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <EmptyState
            title="No orders recorded yet"
            message="When staff place orders via POS, they will appear here in real time."
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Type</th>
                  <th>Table</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Placed By</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  const itemCount = order.items?.reduce((sum, i) => sum + i.quantity, 0) || order.items?.length || 0;
                  const itemSummary = order.items?.map((i) => `${i.quantity}x ${i.item_name}`).join(', ') || 'No items';

                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600 }}>#{order.id}</td>
                      <td>
                        <span style={{ textTransform: 'capitalize', color: order.order_type === 'dine-in' ? '#60a5fa' : '#a78bfa' }}>
                          {order.order_type}
                        </span>
                      </td>
                      <td>{order.table_number ? `Table ${order.table_number}` : '—'}</td>
                      <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={itemSummary}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{itemCount} items: </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{itemSummary}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>
                        ₹{Number(order.total_amount).toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge badge-${order.status}`}>{order.status}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{order.user_name || 'Staff'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .spin-icon {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
