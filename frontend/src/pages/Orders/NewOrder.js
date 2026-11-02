import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch,
  FiPlus,
  FiMinus,
  FiTrash2,
  FiCheckCircle,
  FiShoppingBag,
  FiLayout,
  FiX,
  FiCoffee,
} from 'react-icons/fi';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import './NewOrder.css';

const NewOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const canPlaceOrder = ['ADMIN', 'MANAGER', 'WAITER', 'STAFF', 'CASHIER'].includes(role);

  // Data states
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // POS Order states
  const [orderType, setOrderType] = useState('dine-in'); // 'dine-in' | 'takeaway' | 'delivery'
  const [selectedTable, setSelectedTable] = useState(null); // table object
  const [cart, setCart] = useState([]); // [{ itemId, name, price, quantity, specialNotes }]
  const [specialInstructions, setSpecialInstructions] = useState('');

  // UI Modals
  const [showTableModal, setShowTableModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  // Load menu, categories, and tables from MySQL API
  const loadInitialData = useCallback(async () => {
    try {
      const [catRes, menuRes, tablesRes] = await Promise.all([
        api.get('/categories'),
        api.get('/menu'),
        api.get('/tables'),
      ]);

      const catList = catRes.data?.data || catRes.data || [];
      const menuList = menuRes.data?.data || menuRes.data || [];
      const tablesList = tablesRes.data?.data || tablesRes.data || [];

      setCategories(catList);
      setMenuItems(menuList);
      setTables(tablesList);

      // Auto-select first available table for dine-in if available
      const firstAvailable = tablesList.find((t) => t.status === 'available');
      if (firstAvailable) {
        setSelectedTable(firstAvailable);
      }
    } catch (error) {
      console.error('Failed to load POS data:', error);
      showToast('Error loading menu or tables.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Filter menu items by active category and search keyword
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = activeCategoryId === 'all' || item.category_id === activeCategoryId;
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [menuItems, activeCategoryId, searchQuery]);

  // Cart operations
  const addToCart = (item) => {
    if (!item.available) {
      showToast(`"${item.name}" is currently marked unavailable.`, 'warning');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.itemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (itemId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.itemId === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => prev.filter((item) => item.itemId !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculations
  const calculateSubtotal = (price, quantity) => {
    return Number((price * quantity).toFixed(2));
  };

  const calculateTotal = () => {
    return Number(
      cart
        .reduce((sum, item) => sum + item.price * item.quantity, 0)
        .toFixed(2)
    );
  };

  // Validate and trigger review confirmation modal
  const handleReviewOrder = () => {
    if (cart.length === 0) {
      showToast('Please add at least one item to the order.', 'warning');
      return;
    }

    if (orderType === 'dine-in' && !selectedTable) {
      showToast('Please select an available table for Dine-in orders.', 'warning');
      setShowTableModal(true);
      return;
    }

    setShowConfirmModal(true);
  };

  // Submit order to Express backend / MySQL
  const handleConfirmOrder = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const payload = {
        orderType,
        tableId: orderType === 'dine-in' ? selectedTable?.id : null,
        specialInstructions: specialInstructions.trim() || undefined,
        items: cart.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
          specialNotes: i.specialNotes ? i.specialNotes.trim() : undefined,
        })),
      };

      const response = await api.post('/orders', payload);
      const newOrder = response.data?.data || response.data;

      setCreatedOrder(newOrder);
      setShowConfirmModal(false);
      clearCart();
      setSpecialInstructions('');
      showToast(`Order #${newOrder.id} created successfully!`, 'success');

      // Refresh tables list to update occupancy status
      const tablesRes = await api.get('/tables');
      setTables(tablesRes.data?.data || tablesRes.data || []);
    } catch (error) {
      console.error('Order creation failed:', error);
      const msg = error.response?.data?.message || 'Failed to place order.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canPlaceOrder) {
    return (
      <div className="page-container" style={{ padding: '40px' }}>
        <EmptyState
          title="Access Restricted: Kitchen Role"
          message="Chef and Kitchen staff are restricted from placing customer POS orders. Please navigate to the Kitchen Display System to view and prepare active orders."
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Preparing POS terminal..." />;
  }

  return (
    <div className="pos-container">
      {/* Left side: Menu items & Categories */}
      <div className="pos-menu-section">
        {/* Search & Header */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FiSearch
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '38px' }}
              placeholder="Search food items or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {filteredMenuItems.length} items
          </span>
        </div>

        {/* Category Filter Tabs */}
        <div className="category-tabs">
          <button
            className={`category-tab ${activeCategoryId === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategoryId('all')}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`category-tab ${activeCategoryId === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategoryId(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Food Items Grid */}
        {filteredMenuItems.length === 0 ? (
          <EmptyState
            title="No items found"
            message="Try adjusting your search query or selected category."
          />
        ) : (
          <div className="menu-grid">
            {filteredMenuItems.map((item) => {
              const inCartItem = cart.find((i) => i.itemId === item.id);
              const qtyInCart = inCartItem?.quantity || 0;

              return (
                <div
                  key={item.id}
                  className={`menu-card ${!item.available ? 'unavailable' : ''}`}
                  onClick={() => addToCart(item)}
                >
                  <div>
                    <div className="menu-card-name">{item.name}</div>
                    <div className="menu-card-cat">{item.category_name}</div>
                  </div>
                  <div>
                    <div className="menu-card-price">
                      <span>₹{Number(item.price).toFixed(2)}</span>
                      {qtyInCart > 0 && (
                        <span
                          style={{
                            backgroundColor: 'var(--primary)',
                            color: '#fff',
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                          }}
                        >
                          {qtyInCart} in cart
                        </span>
                      )}
                    </div>
                    {!item.available && (
                      <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 600 }}>
                        Out of stock
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right side: POS Cart / Current Order Ticket */}
      <div className="pos-cart-section">
        <div className="cart-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Current Order
            </h2>
            {cart.length > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={clearCart}
                style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Dine-in vs Takeaway vs Delivery Switch */}
          <div className="order-type-toggle" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            <button
              className={`order-type-btn ${orderType === 'dine-in' ? 'active' : ''}`}
              onClick={() => setOrderType('dine-in')}
            >
              🍽️ Dine-In
            </button>
            <button
              className={`order-type-btn ${orderType === 'takeaway' ? 'active' : ''}`}
              onClick={() => setOrderType('takeaway')}
            >
              🛍️ Takeaway
            </button>
            <button
              className={`order-type-btn ${orderType === 'delivery' ? 'active' : ''}`}
              onClick={() => setOrderType('delivery')}
            >
              🛵 Delivery
            </button>
          </div>

          {/* Table selection for Dine-in */}
          {orderType === 'dine-in' ? (
            <div className="table-selector-box" onClick={() => setShowTableModal(true)}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Assigned Table: </span>
                <strong style={{ color: selectedTable ? '#34d399' : '#ef4444' }}>
                  {selectedTable ? `Table #${selectedTable.table_number} (${selectedTable.location_zone || 'Floor'})` : 'None Selected'}
                </strong>
              </div>
              <span style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 600 }}>
                Change
              </span>
            </div>
          ) : (
            <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-input)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {orderType === 'takeaway' ? 'Takeaway orders do not require a table.' : 'Delivery dispatch order (address details on receipt).'}
            </div>
          )}
        </div>

        {/* Cart Item Rows */}
        <div className="cart-items-list">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
              <FiShoppingBag size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
              <p style={{ fontSize: '14px' }}>Ticket is empty.</p>
              <p style={{ fontSize: '12px' }}>Tap food items to add them.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.itemId} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-unit-price">₹{item.price.toFixed(2)} each</div>
                </div>

                <div className="cart-qty-controls">
                  <button className="qty-btn" onClick={() => updateQuantity(item.itemId, -1)}>
                    <FiMinus size={12} />
                  </button>
                  <span className="cart-qty">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQuantity(item.itemId, 1)}>
                    <FiPlus size={12} />
                  </button>
                </div>

                <div className="cart-item-subtotal">
                  ₹{calculateSubtotal(item.price, item.quantity).toFixed(2)}
                </div>

                <button
                  className="cart-item-remove"
                  onClick={() => removeFromCart(item.itemId)}
                  title="Remove item"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Order Confirmation */}
        <div className="cart-footer">
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Special Kitchen Instructions:
            </label>
            <input
              type="text"
              className="input"
              style={{ fontSize: '13px', padding: '8px 10px' }}
              placeholder="e.g. Extra spicy, serve starters first, pack cutlery"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
            />
          </div>

          <div className="cart-total-row">
            <span className="cart-total-label">Subtotal</span>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              ₹{calculateTotal().toFixed(2)}
            </span>
          </div>

          <div className="cart-total-row">
            <span className="cart-total-label">Total Amount</span>
            <span className="cart-total-amount">₹{calculateTotal().toFixed(2)}</span>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 700 }}
            onClick={handleReviewOrder}
            disabled={cart.length === 0 || submitting}
          >
            Review & Place Order
          </button>
        </div>
      </div>

      {/* Table Selection Modal */}
      {showTableModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Select Restaurant Table</h3>
              <button className="modal-close" onClick={() => setShowTableModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Select an available table for Dine-in order assignment:
              </p>

              <div className="table-grid-select">
                {tables.map((table) => {
                  const isAvailable = table.status === 'available';
                  const isSelected = selectedTable?.id === table.id;

                  return (
                    <div
                      key={table.id}
                      className={`table-select-card ${table.status} ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        if (isAvailable || isSelected) {
                          setSelectedTable(table);
                          setShowTableModal(false);
                          showToast(`Selected Table #${table.table_number}`, 'info');
                        } else {
                          showToast(`Table #${table.table_number} is ${table.status}.`, 'warning');
                        }
                      }}
                    >
                      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        #{table.table_number}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          textTransform: 'capitalize',
                          marginTop: '4px',
                          color: isAvailable ? '#34d399' : '#f87171',
                          fontWeight: 600,
                        }}
                      >
                        {table.status}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTableModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review & Confirm Order Modal (Flowchart Decision: Confirm Order? Yes / No) */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Restaurant Order</h3>
              <button className="modal-close" onClick={() => setShowConfirmModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ORDER TYPE:</span>
                  <div style={{ fontWeight: 700, textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                    {orderType}
                  </div>
                </div>
                {orderType === 'dine-in' && (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ASSIGNED TABLE:</span>
                    <div style={{ fontWeight: 700, color: '#34d399' }}>
                      Table #{selectedTable?.table_number}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '16px' }}>
                {cart.map((item) => (
                  <div
                    key={item.itemId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: '13px',
                    }}
                  >
                    <span>
                      <strong>{item.quantity}x</strong> {item.name}
                    </span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                      ₹{calculateSubtotal(item.price, item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, paddingTop: '10px' }}>
                <span>Total Amount:</span>
                <span style={{ color: '#10b981' }}>₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
              >
                No, Back to Edit
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmOrder}
                disabled={submitting}
              >
                {submitting ? 'Submitting to Kitchen...' : 'Yes, Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Order Confirmation Modal */}
      {createdOrder && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ textAlign: 'center', padding: '30px 24px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                marginBottom: '16px',
              }}
            >
              <FiCheckCircle />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Order Placed Successfully!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
              Order <strong>#{createdOrder.id}</strong> has been saved and queued to the kitchen.
            </p>

            <div
              style={{
                backgroundColor: 'var(--bg-input)',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'left',
                marginBottom: '24px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span className="badge badge-pending">{createdOrder.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Type:</span>
                <span style={{ textTransform: 'capitalize' }}>{createdOrder.order_type}</span>
              </div>
              {createdOrder.table_number && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Table:</span>
                  <span>Table #{createdOrder.table_number}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Total:</span>
                <span style={{ color: '#10b981' }}>₹{Number(createdOrder.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setCreatedOrder(null);
                }}
              >
                Create Another Order
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  navigate('/kitchen');
                }}
              >
                <FiCoffee />
                <span>Go to Kitchen Screen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewOrder;
