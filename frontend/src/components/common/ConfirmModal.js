import React from 'react';

const ConfirmModal = ({ isOpen, title = 'Confirm Action', message = 'Are you sure?', onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', confirmColor = '#ef4444' }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#1a1f2e',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '420px',
        width: '100%',
        border: '1px solid #1e293b',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      }}>
        <h3 style={{
          margin: '0 0 12px',
          color: '#f1f5f9',
          fontSize: '18px',
        }}>{title}</h3>
        <p style={{
          margin: '0 0 24px',
          color: '#94a3b8',
          fontSize: '14px',
          lineHeight: '1.5',
        }}>{message}</p>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #1e293b',
              backgroundColor: '#111827',
              color: '#f1f5f9',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#374151'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#111827'}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: confirmColor,
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.85'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
