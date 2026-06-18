import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Lock, Mail } from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMessage, setErrMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return setErrMessage('Please enter email and password');
    }
    setErrMessage('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setErrMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0b0f19',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Orbs */}
      <div style={{
        position: 'absolute',
        top: '-150px',
        left: '-150px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(50px)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-150px',
        right: '-150px',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(50px)',
        zIndex: 0
      }} />

      <div className="glass-container" style={{
        width: '100%',
        maxWidth: '450px',
        padding: '3rem 2.5rem',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: '#fff',
            fontSize: '1.5rem',
            margin: '0 auto 1rem',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
          }}>
            AG
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Engine Log In</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.25rem' }}>Access your multi-tenant workspace</p>
        </div>

        {errMessage && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            color: '#ef4444',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
            fontWeight: 500
          }}>
            {errMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div>
            <label htmlFor="email">Workspace Email</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>
                <Mail size={18} />
              </span>
              <input 
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password">Security Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>
                <Lock size={18} />
              </span>
              <input 
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
            <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 600 }}>
                Forgot password?
              </Link>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Initializing Session...' : 'Log In'}
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: '#9ca3af',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: '1.5rem'
        }}>
          Need to register your company? <br />
          <Link to="/register" style={{ fontWeight: 600, color: '#06b6d4' }}>Register New Tenant</Link>
        </div>

        {/* Demo credentials tip */}
        <div className="glass-card" style={{
          marginTop: '1.5rem',
          padding: '0.85rem 1rem',
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: '#9ca3af',
          backgroundColor: 'rgba(255, 255, 255, 0.02)'
        }}>
          <span style={{ color: '#f59e0b', fontWeight: 700 }}>DEMO TENANT CREDS (Welcome@123):</span>
          <ul style={{ paddingLeft: '1rem', marginTop: '0.25rem' }}>
            <li>HR Admin: <code>hr@antigravity.com</code></li>
            <li>Manager: <code>manager@antigravity.com</code></li>
            <li>Employee: <code>employee@antigravity.com</code></li>
            <li>Leadership: <code>leader@antigravity.com</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
