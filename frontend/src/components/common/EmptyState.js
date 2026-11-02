import React from 'react';
import { FiInbox } from 'react-icons/fi';

const EmptyState = ({ icon: Icon = FiInbox, title = 'No data found', message = 'There is nothing to display here yet.' }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      color: '#94a3b8',
      textAlign: 'center',
    }}>
      <Icon size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
      <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#f1f5f9' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '14px' }}>{message}</p>
    </div>
  );
};

export default EmptyState;
