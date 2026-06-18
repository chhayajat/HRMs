import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0b0f19',
        color: '#ffffff',
        fontFamily: "'Outfit', sans-serif"
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(99, 102, 241, 0.1)',
          borderTop: '3px solid #6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }} />
        <p style={{ letterSpacing: '0.05em', color: '#9ca3af', fontSize: '0.9rem' }}>LOADING HRMS ENGINE...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
