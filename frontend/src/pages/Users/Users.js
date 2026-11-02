import React, { useState, useEffect, useCallback } from 'react';
import {
  FiUsers,
  FiUserPlus,
  FiEdit2,
  FiShield,
  FiRefreshCw,
  FiX,
} from 'react-icons/fi';
import api from '../../api/axios';
import { showToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './Users.css';

const ROLES = [
  { value: 'ADMIN', label: 'Admin (Full Unrestricted Access Over Everything)' },
  { value: 'MANAGER', label: 'Manager (Floor, Orders, Reports & Inventory)' },
  { value: 'WAITER', label: 'Waiter (POS Order Taking & Table Serving)' },
  { value: 'CHEF', label: 'Chef (Kitchen Display System & Preparation)' },
  { value: 'CASHIER', label: 'Cashier (Billing, Payments & Receipts)' },
];

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('WAITER');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      showToast('Failed to load users.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('WAITER');
    setShowAddModal(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword(''); // leave blank unless updating
    setFormRole(user.role);
    setShowAddModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      showToast('Name and email are required.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      if (editingUser) {
        const payload = {
          name: formName.trim(),
          email: formEmail.trim(),
          role: formRole,
        };
        if (formPassword.trim()) {
          payload.password = formPassword.trim();
        }
        await api.put(`/users/${editingUser.id}`, payload);
        showToast(`User ${formName} updated successfully.`, 'success');
      } else {
        if (!formPassword || formPassword.length < 6) {
          showToast('Password must be at least 6 characters.', 'warning');
          setSubmitting(false);
          return;
        }
        await api.post('/users', {
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword.trim(),
          role: formRole,
        });
        showToast(`User ${formName} created successfully.`, 'success');
      }

      setShowAddModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Save user failed:', error);
      const msg = error.response?.data?.message || 'Failed to save user.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Configure staff accounts, manage passwords, and enforce role-based access</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={fetchUsers} title="Refresh">
            <FiRefreshCw />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <FiUserPlus />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <LoadingSpinner message="Loading user directory..." />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--text-muted)' }}>#{u.id}</td>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <span className={`header-role-badge ${u.role}`}>{u.role}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {new Date(u.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenEdit(u)}
                        title="Edit User"
                      >
                        <FiEdit2 />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingUser ? `Edit User: ${editingUser.name}` : 'Create New User'}
              </h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Rahul Sharma"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    className="input"
                    placeholder="e.g. rahul@restropos.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    {editingUser ? 'New Password (leave empty to keep current)' : 'Password (min 6 chars) *'}
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="••••••••"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required={!editingUser}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Assigned Role *
                  </label>
                  <select
                    className="select"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
