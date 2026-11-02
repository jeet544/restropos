import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';
import { MdRestaurant } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const DEMO_USERS = [
  { role: 'Admin', email: 'admin@restropos.com', pass: 'admin123', color: '#ef4444' },
  { role: 'Staff', email: 'staff@restropos.com', pass: 'staff123', color: '#3b82f6' },
  { role: 'Kitchen', email: 'kitchen@restropos.com', pass: 'kitchen123', color: '#f59e0b' },
  { role: 'Cashier', email: 'cashier@restropos.com', pass: 'cashier123', color: '#10b981' },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const user = await login(email.trim(), password);

      // Role-based smart redirection
      if (user.role === 'kitchen') {
        navigate('/kitchen');
      } else if (user.role === 'cashier') {
        navigate('/cashier');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <MdRestaurant />
          </div>
          <h1>RestroPOS</h1>
          <p>Restaurant Management & POS System</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="email">Email Address</label>
            <div className="login-input-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
              <input
                id="email"
                type="email"
                className="login-input"
                placeholder="e.g. admin@restropos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <div className="login-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '28px', borderTop: '1px solid #1e293b', paddingTop: '20px' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px', textAlign: 'center', fontWeight: 600 }}>
            ⚡ QUICK DEMO ACCOUNTS
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {DEMO_USERS.map((u) => (
              <button
                key={u.role}
                type="button"
                onClick={() => fillDemo(u.email, u.pass)}
                style={{
                  background: '#1a1f2e',
                  border: `1px solid ${u.color}44`,
                  color: u.color,
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                {u.role} Login
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
