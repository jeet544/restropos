import React, { useState, useEffect, useCallback } from 'react';
import {
  FiDollarSign,
  FiCreditCard,
  FiSmartphone,
  FiPrinter,
  FiCheckCircle,
  FiRefreshCw,
  FiShoppingBag,
  FiClock,
} from 'react-icons/fi';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Receipt from '../../components/Receipt/Receipt';
import './Cashier.css';

const Cashier = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const canAccessCashier = ['ADMIN', 'MANAGER', 'CASHIER'].includes(role);

  const [readyOrders, setReadyOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Selected Order for checkout
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'card' | 'upi' | 'wallet'
  const [cashTendered, setCashTendered] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [processing, setProcessing] = useState(false);

  // Active Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Active Tab: 'checkout' vs 'history'
  const [viewTab, setViewTab] = useState('checkout');
  const [recentPayments, setRecentPayments] = useState([]);

  // Fetch orders ready for checkout (READY and SERVED)
  const fetchCheckoutQueue = useCallback(async () => {
    try {
      setLoading(true);
      const [readyRes, servedRes] = await Promise.all([
        api.get('/orders', { params: { status: 'READY', limit: 50 } }),
        api.get('/orders', { params: { status: 'SERVED', limit: 50 } }),
      ]);
      const rOrders = readyRes.data?.data?.orders || readyRes.data?.orders || [];
      const sOrders = servedRes.data?.data?.orders || servedRes.data?.orders || [];
      const orders = [...rOrders, ...sOrders];
      setReadyOrders(orders);

      if (orders.length > 0 && !selectedOrder) {
        setSelectedOrder(orders[0]);
      } else if (orders.length === 0) {
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Failed to load checkout orders:', error);
      showToast('Failed to fetch ready orders.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedOrder]);

  // Fetch recent payments for history tab
  const fetchPaymentsHistory = useCallback(async () => {
    try {
      const res = await api.get('/payments', { params: { limit: 20 } });
      setRecentPayments(res.data?.data?.payments || res.data?.payments || []);
    } catch (error) {
      console.error('Failed to load payments history:', error);
    }
  }, []);

  useEffect(() => {
    fetchCheckoutQueue();
    fetchPaymentsHistory();
  }, [fetchCheckoutQueue, fetchPaymentsHistory]);

  // Calculate change for cash payment
  const orderTotal = selectedOrder ? parseFloat(selectedOrder.total_amount) : 0;
  const tenderedAmount = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedAmount - orderTotal);

  // Complete checkout operation
  const handleProcessCheckout = async () => {
    if (!selectedOrder) return;

    if (paymentMethod === 'cash' && cashTendered && tenderedAmount < orderTotal) {
      showToast(`Tendered cash is less than the bill amount (₹${orderTotal.toFixed(2)}).`, 'warning');
      return;
    }

    try {
      setProcessing(true);
      const response = await api.post(`/orders/${selectedOrder.id}/checkout`, {
        method: paymentMethod.toUpperCase(),
        transactionReference: transactionRef.trim() || undefined,
      });

      const result = response.data?.data || response.data;
      showToast(`Payment successful for Order #${selectedOrder.id}! Table released.`, 'success');

      // Open receipt automatically
      setActiveReceipt(result.receipt || result.order);

      // Refresh queues
      setSelectedOrder(null);
      setCashTendered('');
      setTransactionRef('');
      fetchCheckoutQueue();
      fetchPaymentsHistory();
    } catch (error) {
      console.error('Checkout failed:', error);
      const msg = error.response?.data?.message || 'Payment checkout failed.';
      showToast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (!canAccessCashier) {
    return (
      <div className="page-container" style={{ padding: '40px' }}>
        <EmptyState
          title="Access Restricted: Cashier Only"
          message="Billing, checkout payments, and customer receipt generation are restricted to Cashier and Management staff. Waiters take orders at tables, and Chefs prepare food in the kitchen."
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Cashier & Checkout</h1>
          <p className="page-subtitle">Retrieve kitchen-ready orders, accept payments, release tables, and issue receipts</p>
        </div>
        <div className="page-actions">
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn btn-sm ${viewTab === 'checkout' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewTab('checkout')}
            >
              Ready for Checkout ({readyOrders.length})
            </button>
            <button
              className={`btn btn-sm ${viewTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setViewTab('history');
                fetchPaymentsHistory();
              }}
            >
              Payment History
            </button>
          </div>
          <button className="btn btn-secondary" onClick={fetchCheckoutQueue} title="Refresh">
            <FiRefreshCw />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {viewTab === 'checkout' ? (
        <div className="cashier-layout">
          {/* Left: Ready Orders Grid */}
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Orders Awaiting Payment ({readyOrders.length})
            </h2>

            {loading ? (
              <LoadingSpinner message="Checking for ready orders..." />
            ) : readyOrders.length === 0 ? (
              <div className="card" style={{ padding: '60px 20px' }}>
                <EmptyState
                  title="No orders ready for checkout"
                  message="When the kitchen marks dishes as ready, they will automatically appear here."
                />
              </div>
            ) : (
              <div className="ready-orders-grid">
                {readyOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  const itemsCount = order.items?.reduce((s, i) => s + i.quantity, 0) || order.items?.length || 0;

                  if (!canAccessCashier) {
    return (
      <div className="page-container" style={{ padding: '40px' }}>
        <EmptyState
          title="Access Restricted: Cashier Only"
          message="Billing, checkout payments, and customer receipt generation are restricted to Cashier and Management staff. Waiters take orders at tables, and Chefs prepare food in the kitchen."
        />
      </div>
    );
  }

  return (
                    <div
                      key={order.id}
                      className={`ready-order-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          #{order.id}
                        </span>
                        <span className="badge badge-ready">Ready</span>
                      </div>

                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        {order.order_type === 'dine-in'
                          ? `🍽️ Table #${order.table_number || '?'}`
                          : '🛍️ Takeaway'}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        {itemsCount} items ordered
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bill Amount:</span>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
                          ₹{Number(order.total_amount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Bill Review & Checkout Terminal */}
          <div className="bill-panel">
            {selectedOrder ? (
              <>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Checkout Order #{selectedOrder.id}
                    </h3>
                    <span className="badge badge-ready">Ready</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {selectedOrder.order_type === 'dine-in'
                      ? `Dine-In • Table #${selectedOrder.table_number}`
                      : 'Takeaway Order'}
                  </div>
                </div>

                {/* Items Summary */}
                <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '16px' }}>
                  {selectedOrder.items?.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 0',
                        fontSize: '13px',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <span>
                        {item.quantity}x {item.item_name}
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        ₹{Number(item.subtotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bill Amount Row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Total Payable
                  </span>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
                    ₹{orderTotal.toFixed(2)}
                  </span>
                </div>

                {/* Payment Method Selector */}
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Select Payment Method:
                </div>
                <div className="payment-method-selector" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <button
                    className={`method-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <FiDollarSign size={20} />
                    <span>Cash</span>
                  </button>
                  <button
                    className={`method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <FiCreditCard size={20} />
                    <span>Card</span>
                  </button>
                  <button
                    className={`method-btn ${paymentMethod === 'upi' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('upi')}
                  >
                    <FiSmartphone size={20} />
                    <span>UPI / QR</span>
                  </button>
                  <button
                    className={`method-btn ${paymentMethod === 'wallet' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('wallet')}
                  >
                    <FiSmartphone size={20} />
                    <span>Wallet</span>
                  </button>
                </div>

                {/* Transaction Reference for Non-Cash */}
                {paymentMethod !== 'cash' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      Transaction Reference / TxID
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. TXN-89412085"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                    />
                  </div>
                )}

                {/* Cash Tender Calculation */}
                {paymentMethod === 'cash' && (
                  <div className="cash-tender-box">
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      Cash Tendered (₹)
                    </label>
                    <input
                      type="number"
                      className="input"
                      placeholder={`e.g. ${Math.ceil(orderTotal / 100) * 100}`}
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                    />

                    {/* Quick currency note shortcuts */}
                    <div className="quick-cash-notes">
                      {[100, 200, 500, 1000, 2000].map((note) => (
                        <button
                          key={note}
                          type="button"
                          className="note-btn"
                          onClick={() => setCashTendered(String(note))}
                        >
                          ₹{note}
                        </button>
                      ))}
                    </div>

                    {tenderedAmount > 0 && (
                      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Change Due:</span>
                        <span style={{ color: tenderedAmount >= orderTotal ? '#34d399' : '#ef4444' }}>
                          {tenderedAmount >= orderTotal
                            ? `₹${changeDue.toFixed(2)}`
                            : `Short by ₹${(orderTotal - tenderedAmount).toFixed(2)}`}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Checkout Submit Button */}
                <button
                  className="btn btn-success"
                  style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 700 }}
                  onClick={handleProcessCheckout}
                  disabled={processing}
                >
                  <FiCheckCircle size={18} />
                  <span>{processing ? 'Processing Payment...' : 'Complete Payment & Release Table'}</span>
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <FiShoppingBag size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <h4 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  No Order Selected
                </h4>
                <p style={{ fontSize: '13px' }}>Click on any ready order card on the left to process its checkout.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment #</th>
                  <th>Order #</th>
                  <th>Type</th>
                  <th>Table</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Date & Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>#{p.id}</td>
                    <td>#{p.order_id}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.order_type}</td>
                    <td>{p.table_number ? `Table #${p.table_number}` : 'Takeaway'}</td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>₹{Number(p.amount).toFixed(2)}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                        {p.method.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-completed">{p.status}</span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {new Date(p.created_at).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setActiveReceipt({
                            orderId: p.order_id,
                            orderType: p.order_type,
                            tableNumber: p.table_number,
                            totalAmount: p.amount,
                            paymentMethod: p.method,
                            paidAt: p.created_at,
                            servedBy: p.user_name,
                            items: p.order_items || [],
                          });
                        }}
                      >
                        <FiPrinter />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {activeReceipt && (
        <Receipt receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}
    </div>
  );
};

export default Cashier;
