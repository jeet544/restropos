import React, { useState, useEffect, useCallback } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

let addToastFn = null;

export const showToast = (message, type = 'success', duration = 3000) => {
  if (addToastFn) {
    addToastFn({ message, type, duration, id: Date.now() });
  }
};

const toastConfig = {
  success: { icon: FiCheckCircle, color: '#10b981', bg: '#064e3b' },
  error: { icon: FiAlertCircle, color: '#ef4444', bg: '#7f1d1d' },
  info: { icon: FiInfo, color: '#3b82f6', bg: '#1e3a5f' },
  warning: { icon: FiAlertCircle, color: '#f59e0b', bg: '#78350f' },
};

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts((prev) => prev.slice(1));
      }, toasts[0].duration || 3000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '380px',
      width: '100%',
    }}>
      {toasts.map((toast) => {
        const config = toastConfig[toast.type] || toastConfig.info;
        const IconComponent = config.icon;
        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: config.bg,
              border: `1px solid ${config.color}33`,
              color: '#f1f5f9',
              fontSize: '14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              animation: 'slideIn 0.3s ease',
            }}
          >
            <IconComponent size={18} color={config.color} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                flexShrink: 0,
              }}
            >
              <FiX size={16} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ToastContainer;
