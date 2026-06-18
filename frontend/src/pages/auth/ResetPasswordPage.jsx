import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiCall } from '../../apis/apiClient';
import { Lock, ArrowLeft } from 'lucide-react';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiCall(`/auth/reset-password/${token}`, {
        method: 'POST',
        body: JSON.stringify({ password })
      });
      if (res.success) {
        navigate('/login', { state: { message: res.message } });
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#0b0f19', padding: '2rem'
    }}>
      <div className="glass-container" style={{ width: '100%', maxWidth: '450px', padding: '3rem 2.5rem' }}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to Login
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Reset Password</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Enter your new password below
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: '6px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="password">New Password</label>
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
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>
                <Lock size={18} />
              </span>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                required
                minLength={6}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }} disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
