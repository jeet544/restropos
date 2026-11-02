import React from 'react';
import { useLocation } from 'react-router-dom';
import { FiMenu, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/orders/new': 'New Order',
  '/orders': 'Orders',
  '/menu': 'Menu Management',
  '/tables': 'Table Management',
  '/kitchen': 'Kitchen Dashboard',
  '/cashier': 'Cashier',
  '/users': 'User Management',
  '/reports': 'Reports',
};

const Header = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const pageTitle = pageTitles[location.pathname] || 'RestroPOS';

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-hamburger" onClick={onToggleSidebar}>
          <FiMenu />
        </button>
        <h1 className="header-title">{pageTitle}</h1>
      </div>

      <div className="header-right">
        <div className="header-user-info">
          <span className="header-user-name">{user?.name}</span>
          <span className={`header-role-badge ${user?.role}`}>
            {user?.role}
          </span>
        </div>
        <button className="header-logout-btn" onClick={logout}>
          <FiLogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
