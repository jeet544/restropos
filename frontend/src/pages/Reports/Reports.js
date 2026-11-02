import React, { useState, useEffect, useCallback } from 'react';
import {
  FiDollarSign,
  FiShoppingBag,
  FiTrendingUp,
  FiPieChart,
  FiCalendar,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiLayout,
} from 'react-icons/fi';
import api from '../../api/axios';
import { showToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './Reports.css';

const Reports = () => {
  const [datePreset, setDatePreset] = useState('7d'); // 'today' | '7d' | '30d' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Aggregated data states from MySQL
  const [summary, setSummary] = useState(null);
  const [salesTrends, setSalesTrends] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState([]);
  const [tableUtilization, setTableUtilization] = useState([]);

  // Calculate dates based on preset
  useEffect(() => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (datePreset === 'today') {
      const todayStr = formatDate(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (datePreset === '7d') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    } else if (datePreset === '30d') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    }
  }, [datePreset]);

  // Fetch report data from API
  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [summaryRes, trendsRes, catRes, payRes, tblRes] = await Promise.all([
        api.get('/reports/summary', { params }),
        api.get('/reports/sales-by-date', { params }),
        api.get('/reports/category-breakdown', { params }),
        api.get('/reports/payment-breakdown', { params }),
        api.get('/reports/table-utilization'),
      ]);

      setSummary(summaryRes.data?.data || summaryRes.data);
      setSalesTrends(trendsRes.data?.data || trendsRes.data || []);
      setCategoryBreakdown(catRes.data?.data || catRes.data || []);
      setPaymentBreakdown(payRes.data?.data || payRes.data || []);
      setTableUtilization(tblRes.data?.data || tblRes.data || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
      showToast('Failed to load reports.', 'error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReportData();
    }
  }, [startDate, endDate, fetchReportData]);

  // Max revenue in trends for bar scaling
  const maxTrendRevenue = Math.max(1, ...salesTrends.map((t) => t.revenue));
  // Total payment revenue for percentages
  const totalPaymentRevenue = paymentBreakdown.reduce((s, p) => s + p.amount, 0) || 1;
  // Total category revenue
  const totalCatRevenue = categoryBreakdown.reduce((s, c) => s + c.totalRevenue, 0) || 1;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="reports-header-bar">
        <div>
          <h1 className="page-title">Sales & Operations Reports</h1>
          <p className="page-subtitle">Historical analysis, revenue aggregates, and operational utilization</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Preset Buttons */}
          <div className="date-preset-buttons">
            <button
              className={`preset-btn ${datePreset === 'today' ? 'active' : ''}`}
              onClick={() => setDatePreset('today')}
            >
              Today
            </button>
            <button
              className={`preset-btn ${datePreset === '7d' ? 'active' : ''}`}
              onClick={() => setDatePreset('7d')}
            >
              Last 7 Days
            </button>
            <button
              className={`preset-btn ${datePreset === '30d' ? 'active' : ''}`}
              onClick={() => setDatePreset('30d')}
            >
              Last 30 Days
            </button>
          </div>

          <button className="btn btn-secondary" onClick={fetchReportData} title="Refresh">
            <FiRefreshCw />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Calculating database revenue statistics..." />
      ) : (
        <>
          {/* Top KPI Summary Cards */}
          <div className="reports-kpi-grid">
            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <FiDollarSign />
              </div>
              <div className="stat-info">
                <div className="stat-label">Total Revenue</div>
                <div className="stat-value" style={{ color: '#10b981' }}>
                  ₹{Number(summary?.totalRevenue || 0).toFixed(2)}
                </div>
                <div className="stat-subtext">Completed orders</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <FiShoppingBag />
              </div>
              <div className="stat-info">
                <div className="stat-label">Total Orders Placed</div>
                <div className="stat-value">{summary?.totalOrders || 0}</div>
                <div className="stat-subtext">
                  {summary?.dineInOrders || 0} Dine-in • {summary?.takeawayOrders || 0} Takeaway
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                <FiTrendingUp />
              </div>
              <div className="stat-info">
                <div className="stat-label">Average Ticket Size</div>
                <div className="stat-value">₹{Number(summary?.avgOrderValue || 0).toFixed(2)}</div>
                <div className="stat-subtext">Per completed transaction</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <FiCheckCircle />
              </div>
              <div className="stat-info">
                <div className="stat-label">Completed vs Cancelled</div>
                <div className="stat-value" style={{ fontSize: '20px' }}>
                  <span style={{ color: '#10b981' }}>{summary?.completedOrders || 0}</span>
                  <span style={{ color: 'var(--text-muted)' }}> / </span>
                  <span style={{ color: '#ef4444' }}>{summary?.cancelledOrders || 0}</span>
                </div>
                <div className="stat-subtext">
                  {summary?.completedOrders && summary?.totalOrders
                    ? `${Math.round((summary.completedOrders / summary.totalOrders) * 100)}% completion rate`
                    : '100% completion rate'}
                </div>
              </div>
            </div>
          </div>

          {/* Charts & Breakdown Grid */}
          <div className="reports-charts-grid">
            {/* Daily Sales Bar Chart */}
            <div className="chart-card">
              <div className="chart-card-title">
                <FiTrendingUp style={{ color: '#3b82f6' }} />
                <span>Daily Sales Trend</span>
              </div>

              {salesTrends.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>
                  No historical sales recorded for this date period.
                </div>
              ) : (
                salesTrends.map((t) => {
                  const percent = Math.round((t.revenue / maxTrendRevenue) * 100);
                  const formattedDate = new Date(t.date).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div key={t.date} className="bar-row">
                      <div className="bar-row-header">
                        <span style={{ fontWeight: 600 }}>{formattedDate}</span>
                        <span>
                          <strong style={{ color: '#10b981' }}>₹{t.revenue.toFixed(2)}</strong>{' '}
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                            ({t.completedOrders} orders)
                          </span>
                        </span>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${Math.max(5, percent)}%`,
                            backgroundColor: '#3b82f6',
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Payment Method Breakdown */}
            <div className="chart-card">
              <div className="chart-card-title">
                <FiPieChart style={{ color: '#10b981' }} />
                <span>Payment Method Breakdown</span>
              </div>

              {paymentBreakdown.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>
                  No completed payments recorded.
                </div>
              ) : (
                paymentBreakdown.map((pm) => {
                  const percent = Math.round((pm.amount / totalPaymentRevenue) * 100);
                  const colors = {
                    cash: '#10b981',
                    card: '#3b82f6',
                    upi: '#8b5cf6',
                  };
                  const color = colors[pm.method] || '#60a5fa';

                  return (
                    <div key={pm.method} className="bar-row">
                      <div className="bar-row-header">
                        <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{pm.method}</span>
                        <span>
                          <strong style={{ color }}>₹{pm.amount.toFixed(2)}</strong>{' '}
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            ({percent}% • {pm.count} txns)
                          </span>
                        </span>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Category Sales & Table Utilization */}
          <div className="reports-charts-grid">
            {/* Category Performance */}
            <div className="chart-card">
              <div className="chart-card-title">
                <FiShoppingBag style={{ color: '#f59e0b' }} />
                <span>Sales by Menu Category</span>
              </div>

              {categoryBreakdown.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>
                  No item sales recorded.
                </div>
              ) : (
                categoryBreakdown.map((c) => {
                  const percent = Math.round((c.totalRevenue / totalCatRevenue) * 100);
                  return (
                    <div key={c.categoryId} className="bar-row">
                      <div className="bar-row-header">
                        <span style={{ fontWeight: 600 }}>{c.categoryName}</span>
                        <span>
                          <strong style={{ color: '#f59e0b' }}>₹{c.totalRevenue.toFixed(2)}</strong>{' '}
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            ({c.totalQuantity} items sold)
                          </span>
                        </span>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${Math.max(4, percent)}%`,
                            backgroundColor: '#f59e0b',
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Table Utilization */}
            <div className="chart-card">
              <div className="chart-card-title">
                <FiLayout style={{ color: '#a78bfa' }} />
                <span>Table Utilization Metrics</span>
              </div>

              <div className="table-responsive" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Table</th>
                      <th>Status</th>
                      <th>Orders Served</th>
                      <th style={{ textAlign: 'right' }}>Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableUtilization.map((t) => (
                      <tr key={t.tableId}>
                        <td style={{ fontWeight: 700 }}>Table #{t.tableNumber}</td>
                        <td>
                          <span className={`badge badge-${t.currentStatus}`}>{t.currentStatus}</span>
                        </td>
                        <td>{t.totalOrders}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                          ₹{Number(t.revenue).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
