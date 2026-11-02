import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiX,
  FiCheck,
  FiRefreshCw,
} from 'react-icons/fi';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ConfirmModal from '../../components/common/ConfirmModal';
import './Menu.css';

const Menu = () => {
  const { user } = useAuth();
  const userRole = (user?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN';
  const isManager = userRole === 'MANAGER';
  const isChef = userRole === 'CHEF' || userRole === 'KITCHEN';
  const canManageCatalog = isAdmin || isManager;
  const canToggleStock = isAdmin || isManager || isChef;
  const canDelete = isAdmin;

  // Data states
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  // Category Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');

  // Menu Item Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    prep_time_minutes: 15,
    available: true,
  });

  // Delete Confirm Modal
  const [confirmDelete, setConfirmDelete] = useState({
    isOpen: false,
    type: null, // 'category' | 'item'
    target: null,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, itemRes] = await Promise.all([
        api.get('/categories'),
        api.get('/menu'),
      ]);
      setCategories(catRes.data?.data || catRes.data || []);
      setMenuItems(itemRes.data?.data || itemRes.data || []);
    } catch (error) {
      console.error('Failed to load menu data:', error);
      showToast('Failed to load menu and categories.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchAvailable = showOnlyAvailable ? item.available : true;
      return matchCategory && matchSearch && matchAvailable;
    });
  }, [menuItems, selectedCategory, searchQuery, showOnlyAvailable]);

  // Operations from the class diagram:
  // --- CATEGORY OPERATIONS ---
  const addCategory = async () => {
    if (!categoryNameInput.trim()) {
      showToast('Category name is required.', 'warning');
      return;
    }
    try {
      const res = await api.post('/categories', { name: categoryNameInput.trim() });
      showToast('Category added successfully!', 'success');
      setCategories((prev) => [...prev, res.data?.data || res.data]);
      setShowCategoryModal(false);
      setCategoryNameInput('');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to add category.', 'error');
    }
  };

  const updateCategory = async () => {
    if (!categoryNameInput.trim() || !editingCategory) return;
    try {
      const res = await api.put(`/categories/${editingCategory.id}`, { name: categoryNameInput.trim() });
      showToast('Category updated successfully!', 'success');
      const updated = res.data?.data || res.data;
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryNameInput('');
      loadData(); // refresh menu item category names
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update category.', 'error');
    }
  };

  const deleteCategory = async (catId) => {
    try {
      await api.delete(`/categories/${catId}`);
      showToast('Category deleted successfully!', 'success');
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      if (selectedCategory === catId) setSelectedCategory('all');
      setConfirmDelete({ isOpen: false, type: null, target: null });
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete category.', 'error');
    }
  };

  // --- MENU ITEM OPERATIONS ---
  const addItem = async () => {
    if (!itemForm.name.trim() || !itemForm.price || !itemForm.category_id) {
      showToast('Please fill out all required fields.', 'warning');
      return;
    }
    try {
      const res = await api.post('/menu', {
        name: itemForm.name.trim(),
        description: itemForm.description ? itemForm.description.trim() : '',
        price: parseFloat(itemForm.price),
        category_id: parseInt(itemForm.category_id, 10),
        prep_time_minutes: parseInt(itemForm.prep_time_minutes || 15, 10),
        available: itemForm.available,
      });
      showToast('Menu item added successfully!', 'success');
      setMenuItems((prev) => [...prev, res.data?.data || res.data]);
      setShowItemModal(false);
      setItemForm({ name: '', description: '', price: '', category_id: '', prep_time_minutes: 15, available: true });
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to add menu item.', 'error');
    }
  };

  const updateItem = async () => {
    if (!editingItem) return;
    try {
      const res = await api.put(`/menu/${editingItem.id}`, {
        name: itemForm.name.trim(),
        description: itemForm.description ? itemForm.description.trim() : '',
        price: parseFloat(itemForm.price),
        category_id: parseInt(itemForm.category_id, 10),
        prep_time_minutes: parseInt(itemForm.prep_time_minutes || 15, 10),
        available: itemForm.available,
      });
      showToast('Menu item updated successfully!', 'success');
      const updated = res.data?.data || res.data;
      setMenuItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setShowItemModal(false);
      setEditingItem(null);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update menu item.', 'error');
    }
  };

  const toggleItemAvailability = async (item) => {
    if (!canToggleStock) {
      showToast('You do not have permission to change stock availability.', 'error');
      return;
    }
    try {
      const newAvail = !item.available;
      await api.put(`/menu/${item.id}`, { available: newAvail });
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, available: newAvail } : i))
      );
      showToast(`"${item.name}" marked ${newAvail ? 'Available' : 'Unavailable'}.`, 'info');
    } catch (error) {
      showToast('Failed to toggle availability.', 'error');
    }
  };

  const deleteItem = async (itemId) => {
    try {
      await api.delete(`/menu/${itemId}`);
      showToast('Menu item deleted successfully!', 'success');
      setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
      setConfirmDelete({ isOpen: false, type: null, target: null });
    } catch (error) {
      showToast(error.response?.data?.message || 'Cannot delete item.', 'error');
    }
  };

  const openAddItemModal = () => {
    setEditingItem(null);
    setItemForm({
      name: '',
      description: '',
      price: '',
      category_id: categories[0]?.id || '',
      prep_time_minutes: 15,
      available: true,
    });
    setShowItemModal(true);
  };

  const openEditItemModal = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category_id: item.category_id,
      prep_time_minutes: item.prep_time_minutes || 15,
      available: !!item.available,
    });
    setShowItemModal(true);
  };

  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setCategoryNameInput('');
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (cat, e) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setCategoryNameInput(cat.name);
    setShowCategoryModal(true);
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Menu Management</h1>
          <p className="page-subtitle">Configure restaurant categories, menu items, prices, and stock availability</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadData} title="Refresh">
            <FiRefreshCw />
            <span>Refresh</span>
          </button>
          {canManageCatalog && (
            <button className="btn btn-secondary" onClick={openAddCategoryModal}>
              <FiPlus />
              <span>Add Category</span>
            </button>
          )}
          {canManageCatalog && (
            <button className="btn btn-primary" onClick={openAddItemModal}>
              <FiPlus />
              <span>Add Menu Item</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading menu catalog..." />
      ) : (
        <div className="menu-layout">
          {/* Categories Sidebar */}
          <div className="categories-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Categories</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{categories.length} Total</span>
            </div>

            <div
              className={`category-item ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              <span>All Categories</span>
              <span style={{ fontSize: '12px', opacity: 0.8 }}>{menuItems.length}</span>
            </div>

            {categories.map((cat) => {
              const count = menuItems.filter((i) => i.category_id === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className={`category-item ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span>{cat.name}</span>
                  <div className="category-item-actions">
                    <span style={{ fontSize: '12px', opacity: 0.8, marginRight: '4px' }}>{count}</span>
                    {canManageCatalog && (
                      <button
                        className="category-action-btn"
                        onClick={(e) => openEditCategoryModal(cat, e)}
                        title="Edit Category"
                      >
                        <FiEdit2 size={13} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="category-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete({
                            isOpen: true,
                            type: 'category',
                            target: cat,
                          });
                        }}
                        title="Delete Category"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Menu Items Table Panel */}
          <div className="items-panel">
            {/* Toolbar */}
            <div className="items-toolbar">
              <div style={{ position: 'relative', width: '280px' }}>
                <FiSearch
                  size={16}
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
                  style={{ paddingLeft: '36px' }}
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={showOnlyAvailable}
                    onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                  />
                  <span>Show only available</span>
                </label>
              </div>
            </div>

            {/* Items Table */}
            {filteredItems.length === 0 ? (
              <EmptyState
                title="No menu items found"
                message="Add items to this category or adjust your search filter."
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th style={{ textAlign: 'center' }}>In Stock</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>#{item.id}</td>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{item.category_name}</td>
                        <td style={{ fontWeight: 700, color: '#10b981' }}>
                          ₹{Number(item.price).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={!!item.available}
                              disabled={!canToggleStock}
                              onChange={() => toggleItemAvailability(item)}
                            />
                            <span className="toggle-slider" />
                          </label>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            {canManageCatalog ? (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openEditItemModal(item)}
                                title="Edit item details & price"
                              >
                                <FiEdit2 />
                              </button>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Read-only</span>
                            )}
                            {canDelete && (
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                onClick={() =>
                                  setConfirmDelete({
                                    isOpen: true,
                                    type: 'item',
                                    target: item,
                                  })
                                }
                                title="Delete item"
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {showCategoryModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button className="modal-close" onClick={() => setShowCategoryModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Category Name
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Starters, Beverages, Desserts"
                value={categoryNameInput}
                onChange={(e) => setCategoryNameInput(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={editingCategory ? updateCategory : addCategory}
              >
                {editingCategory ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Menu Item Modal */}
      {showItemModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button className="modal-close" onClick={() => setShowItemModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Item Name *
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Paneer Butter Masala"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Category *
                  </label>
                  <select
                    className="select"
                    value={itemForm.category_id}
                    onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                    required
                  >
                    <option value="" disabled>Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    placeholder="0.00"
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={itemForm.available}
                      onChange={(e) => setItemForm({ ...itemForm, available: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                    Item is Available (In Stock)
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowItemModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={editingItem ? updateItem : addItem}>
                {editingItem ? 'Update Item' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title={confirmDelete.type === 'category' ? 'Delete Category' : 'Delete Menu Item'}
        message={
          confirmDelete.type === 'category'
            ? `Are you sure you want to delete category "${confirmDelete.target?.name}"? Deletion will be rejected if menu items still reference it.`
            : `Are you sure you want to delete "${confirmDelete.target?.name}"? Historical orders will retain their data, but this item will be removed from the active menu.`
        }
        confirmText="Delete"
        onConfirm={() => {
          if (confirmDelete.type === 'category') {
            deleteCategory(confirmDelete.target?.id);
          } else {
            deleteItem(confirmDelete.target?.id);
          }
        }}
        onCancel={() => setConfirmDelete({ isOpen: false, type: null, target: null })}
      />
    </div>
  );
};

export default Menu;
