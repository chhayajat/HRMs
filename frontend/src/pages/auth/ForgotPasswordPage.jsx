import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiCall } from '../../apis/apiClient';
import { Mail, ArrowLeft } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await apiCall('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setMessage(res.message || 'If an account exists with that email, a password reset link has been sent.');
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
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
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Forgot Password</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: '6px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: '6px', color: '#10b981', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="email">Email Address</label>
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }} disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
