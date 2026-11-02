import React, { useState, useEffect, useCallback } from 'react';
import {
  FiPlus,
  FiLayout,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiRefreshCw,
  FiX,
  FiEdit2,
} from 'react-icons/fi';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import './Tables.css';

const STATUS_CONFIG = {
  available: { label: 'Available', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: FiCheckCircle },
  occupied: { label: 'Occupied', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: FiXCircle },
  reserved: { label: 'Reserved', color: '#a78bfa', bg: 'rgba(139, 92, 246, 0.15)', icon: FiClock },
  cleaning: { label: 'Cleaning', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: FiRefreshCw },
  out_of_service: { label: 'Out of Service', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', icon: FiXCircle },
};

const Tables = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isManager = role === 'MANAGER';
  const canManageTables = isAdmin || isManager;
  const canUpdateStatus = ['ADMIN', 'MANAGER', 'WAITER', 'STAFF', 'CASHIER'].includes(role);

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status Filter
  const [activeFilter, setActiveFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newLocationZone, setNewLocationZone] = useState('Main Dining');
  const [selectedTable, setSelectedTable] = useState(null); // for status change modal
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/tables');
      setTables(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
      showToast('Failed to load table list.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // RestaurantTable operations:
  // updateStatus() from class diagram
  const updateStatus = async (tableId, status) => {
    try {
      setUpdating(true);
      const res = await api.patch(`/tables/${tableId}/status`, { status });
      const updated = res.data?.data || res.data;
      setTables((prev) => prev.map((t) => (t.id === tableId ? updated : t)));
      showToast(`Table #${updated.table_number} status updated to ${status}.`, 'success');
      setSelectedTable(null);
    } catch (error) {
      console.error('Failed to update table status:', error);
      showToast(error.response?.data?.message || 'Failed to update table status.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const addTable = async () => {
    const num = parseInt(newTableNumber, 10);
    if (!num || num <= 0) {
      showToast('Please enter a valid positive table number.', 'warning');
      return;
    }
    try {
      const res = await api.post('/tables', {
        table_number: num,
        capacity: parseInt(newCapacity, 10) || 4,
        location_zone: newLocationZone.trim() || 'Main Dining',
        status: 'AVAILABLE'
      });
      const newTbl = res.data?.data || res.data;
      setTables((prev) => [...prev, newTbl].sort((a, b) => a.table_number - b.table_number));
      showToast(`Table #${newTbl.table_number} added successfully.`, 'success');
      setShowAddModal(false);
      setNewTableNumber('');
      setNewCapacity('4');
      setNewLocationZone('Main Dining');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create table.', 'error');
    }
  };

  const filteredTables = tables.filter((t) => {
    const s = (t.status || '').toLowerCase();
    return activeFilter === 'all' ? true : s === activeFilter.toLowerCase();
  });

  const availableCount = tables.filter((t) => (t.status || '').toLowerCase() === 'available').length;
  const occupiedCount = tables.filter((t) => (t.status || '').toLowerCase() === 'occupied').length;
  const reservedCount = tables.filter((t) => (t.status || '').toLowerCase() === 'reserved').length;
  const cleaningCount = tables.filter((t) => ['cleaning', 'out_of_service'].includes((t.status || '').toLowerCase())).length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Table Management</h1>
          <p className="page-subtitle">Visual floor layout, dining room availability, and table status controls</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={fetchTables} title="Refresh tables">
            <FiRefreshCw />
            <span>Refresh</span>
          </button>
          {canManageTables && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <FiPlus />
              <span>Add Table</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="table-status-summary">
        <div
          className={`table-summary-card ${activeFilter === 'all' ? 'active-filter' : ''}`}
          onClick={() => setActiveFilter('all')}
          style={{ cursor: 'pointer' }}
        >
          <div className="table-summary-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <FiLayout />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Tables</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>{tables.length}</div>
          </div>
        </div>

        <div
          className="table-summary-card"
          onClick={() => setActiveFilter('available')}
          style={{ cursor: 'pointer' }}
        >
          <div className="table-summary-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <FiCheckCircle />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Available</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981' }}>{availableCount}</div>
          </div>
        </div>

        <div
          className="table-summary-card"
          onClick={() => setActiveFilter('occupied')}
          style={{ cursor: 'pointer' }}
        >
          <div className="table-summary-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <FiXCircle />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Occupied</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#ef4444' }}>{occupiedCount}</div>
          </div>
        </div>

        <div
          className="table-summary-card"
          onClick={() => setActiveFilter('reserved')}
          style={{ cursor: 'pointer' }}
        >
          <div className="table-summary-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <FiClock />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Reserved</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#a78bfa' }}>{reservedCount}</div>
          </div>
        </div>

        <div
          className="table-summary-card"
          onClick={() => setActiveFilter('cleaning')}
          style={{ cursor: 'pointer' }}
        >
          <div className="table-summary-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <FiRefreshCw />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cleaning</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b' }}>{cleaningCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'available', 'occupied', 'reserved', 'cleaning'].map((filter) => (
          <button
            key={filter}
            className={`btn btn-sm ${activeFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter(filter)}
            style={{ textTransform: 'capitalize' }}
          >
            {filter === 'all' ? 'All Tables' : filter}
          </button>
        ))}
      </div>

      {/* Visual Table Floor Grid */}
      {loading ? (
        <LoadingSpinner message="Loading restaurant floor layout..." />
      ) : filteredTables.length === 0 ? (
        <EmptyState
          title="No tables found"
          message="No restaurant tables match the selected status filter."
        />
      ) : (
        <div className="floor-grid">
          {filteredTables.map((table) => {
            const statusKey = (table.status || 'available').toLowerCase();
            const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.available;
            const Icon = config.icon;

            return (
              <div
                key={table.id}
                className={`floor-table-card ${statusKey}`}
                onClick={() => {
                  if (canUpdateStatus) {
                    setSelectedTable(table);
                    setNewStatus(statusKey);
                  }
                }}
              >
                <div className="table-icon-circle" style={{ backgroundColor: config.bg, color: config.color }}>
                  <Icon />
                </div>

                <div>
                  <div className="table-number-title">Table #{table.table_number}</div>
                  <span className={`badge badge-${statusKey}`}>{config.label}</span>
                </div>

                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <div><strong>Zone:</strong> {table.location_zone || 'Main Dining'}</div>
                  <div><strong>Capacity:</strong> {table.capacity || 4} Seats</div>
                </div>

                <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {canUpdateStatus ? 'Click to change status' : 'Table view'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Status Update Modal */}
      {selectedTable && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Update Table #{selectedTable.table_number}</h3>
              <button className="modal-close" onClick={() => setSelectedTable(null)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Select Table Status:
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.entries(STATUS_CONFIG).map(([stKey, stVal]) => (
                  <button
                    key={stKey}
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      borderColor: newStatus === stKey ? stVal.color : 'var(--border-color)',
                      backgroundColor: newStatus === stKey ? stVal.bg : 'var(--bg-input)',
                      color: newStatus === stKey ? stVal.color : 'var(--text-primary)',
                      fontWeight: 600,
                    }}
                    onClick={() => setNewStatus(stKey)}
                  >
                    {stVal.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedTable(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => updateStatus(selectedTable.id, newStatus)}
                disabled={updating || newStatus === selectedTable.status}
              >
                {updating ? 'Updating...' : 'Save Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal (Admin) */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '380px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Add Restaurant Table</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Table Number (Integer) *
              </label>
              <input
                type="number"
                min="1"
                className="input"
                placeholder="e.g. 11"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                autoFocus
              />

              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginTop: '12px', marginBottom: '8px' }}>
                Seating Capacity
              </label>
              <input
                type="number"
                min="1"
                className="input"
                placeholder="e.g. 4"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
              />

              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginTop: '12px', marginBottom: '8px' }}>
                Location Zone
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Main Dining, Patio, VIP Lounge"
                value={newLocationZone}
                onChange={(e) => setNewLocationZone(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={addTable}>
                Add Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tables;
