import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0a0e1a',
      }}>
        <LoadingSpinner message="Authenticating session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const userRole = (user?.role || '').toUpperCase();
    
    // ADMIN has absolute unrestricted access over everything
    if (userRole === 'ADMIN') {
      return children;
    }

    const isAuthorized = allowedRoles.some((allowed) => {
      const r = allowed.toUpperCase();
      if (userRole === r) return true;
      if ((r === 'STAFF' || r === 'WAITER') && (userRole === 'WAITER' || userRole === 'STAFF')) return true;
      if ((r === 'KITCHEN' || r === 'CHEF') && (userRole === 'CHEF' || userRole === 'KITCHEN')) return true;
      if (r === 'MANAGER' && userRole === 'MANAGER') return true;
      if (r === 'CASHIER' && userRole === 'CASHIER') return true;
      return false;
    });

    if (!isAuthorized) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '400px',
          color: '#94a3b8',
          textAlign: 'center',
          padding: '40px',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '16px',
          }}>🚫</div>
          <h2 style={{ color: '#ef4444', margin: '0 0 8px' }}>Access Denied</h2>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Your role (<strong>{user?.role}</strong>) does not have permission to access this section.<br />
            Required role clearance: {allowedRoles.join(', ')}.
          </p>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
