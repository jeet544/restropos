import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FiGrid,
  FiPlusCircle,
  FiShoppingBag,
  FiBookOpen,
  FiLayout,
  FiCoffee,
  FiDollarSign,
  FiUsers,
  FiBarChart2,
} from 'react-icons/fi';
import { MdRestaurant } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const rawRole = (user?.role || 'WAITER').toUpperCase();
  const isAdmin = rawRole === 'ADMIN';

  // Normalize role aliases and ensure Admin has access over everything
  const isMatchRole = (allowedList) => {
    if (isAdmin) return true; // ADMIN has access over everything
    return allowedList.some((r) => {
      const allowed = r.toUpperCase();
      if (rawRole === allowed) return true;
      if ((allowed === 'STAFF' || allowed === 'WAITER') && (rawRole === 'WAITER' || rawRole === 'STAFF')) return true;
      if ((allowed === 'KITCHEN' || allowed === 'CHEF') && (rawRole === 'CHEF' || rawRole === 'KITCHEN')) return true;
      if (allowed === 'MANAGER' && rawRole === 'MANAGER') return true;
      if (allowed === 'CASHIER' && rawRole === 'CASHIER') return true;
      return false;
    });
  };

  const mainNav = [
    { to: '/dashboard', icon: FiGrid, label: 'Dashboard' },
    { to: '/orders/new', icon: FiPlusCircle, label: 'New Order', roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER'] },
    { to: '/orders', icon: FiShoppingBag, label: 'Orders' },
    { to: '/menu', icon: FiBookOpen, label: 'Menu Catalog', roles: ['ADMIN', 'MANAGER', 'WAITER', 'CHEF'] },
    { to: '/tables', icon: FiLayout, label: 'Tables', roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER'] },
  ];

  const operationsNav = [
    { to: '/kitchen', icon: FiCoffee, label: 'Kitchen KDS', roles: ['ADMIN', 'MANAGER', 'CHEF'] },
    { to: '/cashier', icon: FiDollarSign, label: 'Cashier Checkout', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  ];

  const adminNav = [
    { to: '/reports', icon: FiBarChart2, label: 'Reports', roles: ['ADMIN', 'MANAGER'] },
    { to: '/users', icon: FiUsers, label: 'Users & Roles', roles: ['ADMIN'] },
  ];

  const renderNavItems = (items) => {
    return items
      .filter((item) => !item.roles || isMatchRole(item.roles))
      .map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/orders' || item.to === '/dashboard'}
          className={({ isActive }) =>
            `sidebar-nav-item ${isActive ? 'active' : ''}`
          }
          onClick={onClose}
        >
          <item.icon className="nav-icon" />
          <span>{item.label}</span>
        </NavLink>
      ));
  };

  const hasOperations = operationsNav.some((item) => !item.roles || isMatchRole(item.roles));
  const hasAdmin = adminNav.some((item) => !item.roles || isMatchRole(item.roles));

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <MdRestaurant />
          </div>
          <span className="sidebar-logo-text">RestroPOS</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main</div>
          {renderNavItems(mainNav)}

          {hasOperations && (
            <>
              <div className="sidebar-section-label">Operations</div>
              {renderNavItems(operationsNav)}
            </>
          )}

          {hasAdmin && (
            <>
              <div className="sidebar-section-label">Management</div>
              {renderNavItems(adminNav)}
            </>
          )}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
