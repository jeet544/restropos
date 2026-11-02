import React from 'react';
import './Receipt.css';

const Receipt = ({ order, receipt, onClose }) => {
  // Support both direct order object and receipt payload
  const activeReceipt = receipt || order;
  if (!activeReceipt) return null;

  const formatDate = (dateStr) => {
    try {
      const d = dateStr ? new Date(dateStr) : new Date();
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const formatTime = (dateStr) => {
    try {
      const d = dateStr ? new Date(dateStr) : new Date();
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const items = activeReceipt.items || [];
  const orderId = activeReceipt.orderId || activeReceipt.id || activeReceipt.order_id || '---';
  const orderType = activeReceipt.orderType || activeReceipt.order_type || 'dine-in';
  const tableNumber = activeReceipt.tableNumber || activeReceipt.table_number || (activeReceipt.table?.tableNumber ?? null);
  const total = parseFloat(activeReceipt.totalAmount || activeReceipt.total_amount || activeReceipt.amount || 0);
  const paymentMethod = activeReceipt.paymentMethod || activeReceipt.method || activeReceipt.payment_method;
  const createdAt = activeReceipt.paidAt || activeReceipt.created_at || activeReceipt.createdAt || new Date();
  const servedBy = activeReceipt.servedBy || activeReceipt.user_name || activeReceipt.serverName;

  return (
    <div className="receipt-overlay">
      <div className="receipt-modal">
        <div className="receipt-content">
          <div className="receipt-header">
            <h2>RestroPOS</h2>
            <p>Fine Dining & Modern POS</p>
            <p>{formatDate(createdAt)} at {formatTime(createdAt)}</p>
          </div>

          <div className="receipt-info">
            <p><strong>Order #:</strong> #{orderId}</p>
            <p><strong>Type:</strong> {orderType === 'dine-in' ? 'Dine-In' : 'Takeaway'}</p>
            {tableNumber && (
              <p><strong>Table:</strong> #{tableNumber}</p>
            )}
            {servedBy && (
              <p><strong>Server:</strong> {servedBy}</p>
            )}
          </div>

          <div className="receipt-items">
            <div className="receipt-item-row" style={{ fontWeight: 700, borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', marginBottom: '8px' }}>
              <span className="receipt-item-name">Item</span>
              <span className="receipt-item-qty">Qty</span>
              <span className="receipt-item-price">Subtotal</span>
            </div>
            {items.map((item, idx) => {
              const name = item.name || item.item_name || item.menuItem?.name || 'Item';
              const qty = item.quantity || 1;
              const unitPrice = parseFloat(item.unitPrice || item.unit_price || item.price || 0);
              const subtotal = parseFloat(item.subtotal || (unitPrice * qty));

              return (
                <div key={idx} className="receipt-item-row">
                  <span className="receipt-item-name">{name}</span>
                  <span className="receipt-item-qty">{qty}</span>
                  <span className="receipt-item-price">₹{subtotal.toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          <div className="receipt-total-row">
            <span>Total Amount</span>
            <span>₹{total.toFixed(2)}</span>
          </div>

          {paymentMethod && (
            <div className="receipt-payment">
              Paid via <strong>{paymentMethod.toUpperCase()}</strong>
            </div>
          )}

          <div className="receipt-footer">
            <p>Thank you for dining with us!</p>
            <p style={{ fontSize: '11px', marginTop: '4px' }}>Please visit again 🙏</p>
          </div>
        </div>

        <div className="receipt-actions">
          <button className="receipt-print-btn" onClick={handlePrint}>
            🖨️ Print Receipt
          </button>
          <button className="receipt-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
