import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0a0e1a' }}>
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="layout-content" style={{
        flex: 1,
        marginLeft: '250px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        transition: 'margin-left 0.3s ease',
      }}>
        <Header onToggleSidebar={toggleSidebar} />
        <main style={{
          flex: 1,
          padding: '24px',
          marginTop: '60px',
          overflowY: 'auto',
        }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .layout-content {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
