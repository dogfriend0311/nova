import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const LoginModal = ({ onClose }) => {
  const [tab, setTab]           = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login, signup } = useAuth();

  const switchTab = (t) => { setTab(t); setError(''); setUsername(''); setPassword(''); setConfirm(''); };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const result = login(username, password);
      if (result.success) onClose();
      else setError(result.error || 'Login failed');
      setLoading(false);
    }, 400);
  };

  const handleSignup = (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 4)  { setError('Password must be at least 4 characters'); return; }
    setLoading(true);
    setTimeout(() => {
      const result = signup(username, password);
      if (result.success) onClose();
      else setError(result.error || 'Signup failed');
      setLoading(false);
    }, 300);
  };

  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div className="lm-overlay" onClick={handleOverlay}>
      <div className="lm-card neon-card">
        <button className="lm-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="lm-header">
          <span className="lm-rocket">🚀</span>
          <h2 className="gradient-text" style={{ margin: 0, fontSize: '1.6rem' }}>Nova</h2>
        </div>

        <div className="lm-tabs">
          <button className={`lm-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>Sign In</button>
          <button className={`lm-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => switchTab('signup')}>Sign Up</button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="lm-form">
            <div className="form-group">
              <label htmlFor="lm-user">Username</label>
              <input id="lm-user" type="text" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} required />
            </div>
            <div className="form-group">
              <label htmlFor="lm-pass">Password</label>
              <input id="lm-pass" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="neon-button lm-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <p className="lm-switch-hint">
              No account?{' '}
              <button type="button" className="lm-link" onClick={() => switchTab('signup')}>Sign up here</button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="lm-form">
            <div className="form-group">
              <label htmlFor="lm-su-user">Username</label>
              <input id="lm-su-user" type="text" placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} required />
            </div>
            <div className="form-group">
              <label htmlFor="lm-su-pass">Password</label>
              <input id="lm-su-pass" type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required />
            </div>
            <div className="form-group">
              <label htmlFor="lm-su-conf">Confirm Password</label>
              <input id="lm-su-conf" type="password" placeholder="Confirm your password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={loading} required />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="neon-button lm-submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
            <p className="lm-switch-hint">
              Already have an account?{' '}
              <button type="button" className="lm-link" onClick={() => switchTab('login')}>Sign in here</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
