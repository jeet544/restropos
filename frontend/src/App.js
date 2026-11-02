import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import ToastContainer from './components/common/Toast';
import { useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import NewOrder from './pages/Orders/NewOrder';
import Orders from './pages/Orders/Orders';
import Menu from './pages/Menu/Menu';
import Tables from './pages/Tables/Tables';
import Kitchen from './pages/Kitchen/Kitchen';
import Cashier from './pages/Cashier/Cashier';
import Users from './pages/Users/Users';
import Reports from './pages/Reports/Reports';

function App() {
  const { isAuthenticated, user } = useAuth();
  const role = (user?.role || '').toLowerCase();

  return (
    <>
      <ToastContainer />
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate
                to={
                  role === 'kitchen' || role === 'chef'
                    ? '/kitchen'
                    : role === 'cashier'
                    ? '/cashier'
                    : '/dashboard'
                }
                replace
              />
            ) : (
              <Login />
            )
          }
        />

        {/* Authenticated Layout Routes */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* POS & Orders - Waiter, Cashier, Manager, Admin */}
          <Route
            path="/orders/new"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'WAITER', 'CASHIER']}>
                <NewOrder />
              </ProtectedRoute>
            }
          />
          <Route path="/orders" element={<Orders />} />

          {/* Menu Catalog */}
          <Route
            path="/menu"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'WAITER', 'CHEF']}>
                <Menu />
              </ProtectedRoute>
            }
          />

          {/* Tables Management - Waiter, Cashier, Manager, Admin */}
          <Route
            path="/tables"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'WAITER', 'CASHIER']}>
                <Tables />
              </ProtectedRoute>
            }
          />

          {/* Operations: Kitchen KDS - Chef & Manager & Admin only */}
          <Route
            path="/kitchen"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'CHEF']}>
                <Kitchen />
              </ProtectedRoute>
            }
          />

          {/* Operations: Cashier Checkout - Cashier & Manager & Admin only */}
          <Route
            path="/cashier"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
                <Cashier />
              </ProtectedRoute>
            }
          />

          {/* Admin Management: Users & Staff - Strictly Admin only */}
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Users />
              </ProtectedRoute>
            }
          />

          {/* Reports & Analytics - Admin & Manager only */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                <Reports />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Default Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;
