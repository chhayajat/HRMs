import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Check, X, FileEdit, MessageSquare } from 'lucide-react';

const Approvals = () => {
  const { user, apiCall } = useAuth();
  const [approvals, setApprovals] = useState({ leaves: [], regularizations: [], profileEdits: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leaves');
  
  // Decision processing state
  const [comments, setComments] = useState({});
  const [actioning, setActioning] = useState(null);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/approvals');
      if (res.success) {
        setApprovals(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const handleAction = async (type, id, status) => {
    setActioning(id);
    const comment = comments[id] || '';
    
    let endpoint = '';
    if (type === 'leave') endpoint = `/approvals/leave/${id}`;
    else if (type === 'regularize') endpoint = `/approvals/regularize/${id}`;
    else if (type === 'profile-edit') endpoint = `/approvals/profile-edit/${id}`;

    try {
      const res = await apiCall(endpoint, {
        method: 'PUT',
        body: JSON.stringify({ status, comments: comment })
      });
      if (res.success) {
        // Clear comment
        setComments(prev => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
        fetchPendingApprovals();
      }
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setActioning(null);
    }
  };

  const handleCommentChange = (id, val) => {
    setComments(prev => ({
      ...prev,
      [id]: val
    }));
  };

  const isHr = user?.role === 'HR';

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Approval Workspace</h1>
        <p style={{ color: '#9ca3af' }}>Review leave requests, log corrections, and sensitive profile edits.</p>
      </div>

      {loading ? (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '4rem' }}>Synchronizing workflow requests...</div>
      ) : (
        <>
          {/* Tab Selection */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '2rem',
            gap: '1.5rem'
          }}>
            <button
              onClick={() => setActiveTab('leaves')}
              style={{
                paddingBottom: '0.75rem',
                background: 'none',
                border: 'none',
                color: activeTab === 'leaves' ? '#6366f1' : '#9ca3af',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                borderBottom: activeTab === 'leaves' ? '3px solid #6366f1' : '3px solid transparent'
              }}
            >
              Leave Requests ({approvals.leaves?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('regularizations')}
              style={{
                paddingBottom: '0.75rem',
                background: 'none',
                border: 'none',
                color: activeTab === 'regularizations' ? '#6366f1' : '#9ca3af',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                borderBottom: activeTab === 'regularizations' ? '3px solid #6366f1' : '3px solid transparent'
              }}
            >
              Time Regularizations ({approvals.regularizations?.length || 0})
            </button>
            {isHr && (
              <button
                onClick={() => setActiveTab('profileEdits')}
                style={{
                  paddingBottom: '0.75rem',
                  background: 'none',
                  border: 'none',
                  color: activeTab === 'profileEdits' ? '#6366f1' : '#9ca3af',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'profileEdits' ? '3px solid #6366f1' : '3px solid transparent'
                }}
              >
                Profile Edits ({approvals.profileEdits?.length || 0})
              </button>
            )}
          </div>

          {/* RENDERING PENDING LEAVES */}
          {activeTab === 'leaves' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {approvals.leaves?.length === 0 ? (
                <div style={{ color: '#9ca3af', textAlign: 'center', padding: '3rem' }}>No pending leave applications.</div>
              ) : (
                approvals.leaves.map(req => (
                  <div key={req._id} className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase' }}>
                        {req.leaveType} Leave Request
                      </div>
                      <h3 style={{ margin: '0.25rem 0', fontSize: '1.2rem' }}>{req.employeeId?.personal?.name}</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                        ID: {req.employeeId?.employeeId} | {req.employeeId?.employment?.designation} ({req.employeeId?.employment?.department})
                      </p>
                      
                      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>Start Date:</span>{' '}
                          <strong>{new Date(req.startDate).toLocaleDateString()}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>End Date:</span>{' '}
                          <strong>{new Date(req.endDate).toLocaleDateString()}</strong>
                        </div>
                        {req.halfDay && <span className="badge badge-warning">Half-Day</span>}
                      </div>

                      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem' }}>
                        <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem' }}>Reason for leave:</span>
                        "{req.reason}"
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
                      <label>Decision Comments</label>
                      <input 
                        type="text" 
                        placeholder="Add comments or review notes..."
                        value={comments[req._id] || ''}
                        onChange={(e) => handleCommentChange(req._id, e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                          onClick={() => handleAction('leave', req._id, 'Rejected')}
                          className="btn btn-secondary"
                          style={{ flex: 1, borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                          disabled={actioning === req._id}
                        >
                          <X size={16} />
                          <span>Reject</span>
                        </button>
                        <button 
                          onClick={() => handleAction('leave', req._id, 'Approved')}
                          className="btn btn-primary"
                          style={{ flex: 1 }}
                          disabled={actioning === req._id}
                        >
                          <Check size={16} />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* RENDERING PENDING REGULARIZATIONS */}
          {activeTab === 'regularizations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {approvals.regularizations?.length === 0 ? (
                <div style={{ color: '#9ca3af', textAlign: 'center', padding: '3rem' }}>No pending time regularization requests.</div>
              ) : (
                approvals.regularizations.map(rec => (
                  <div key={rec._id} className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#06b6d4', fontWeight: 700, textTransform: 'uppercase' }}>
                        Attendance Correction
                      </div>
                      <h3 style={{ margin: '0.25rem 0', fontSize: '1.2rem' }}>{rec.employeeId?.personal?.name}</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                        ID: {rec.employeeId?.employeeId} | {rec.employeeId?.employment?.designation}
                      </p>
                      
                      <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>Date for Correction:</span>{' '}
                          <strong>{new Date(rec.date).toLocaleDateString()}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                          <div>
                            <span style={{ color: '#6b7280' }}>Requested In:</span>{' '}
                            <strong style={{ color: '#10b981' }}>
                              {new Date(rec.regularization.requestedPunches.find(p => p.type === 'In')?.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: '#6b7280' }}>Requested Out:</span>{' '}
                            <strong style={{ color: '#ef4444' }}>
                              {new Date(rec.regularization.requestedPunches.find(p => p.type === 'Out')?.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem' }}>
                        <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem' }}>Reason:</span>
                        "{rec.regularization.reason}"
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
                      <label>Decision Comments</label>
                      <input 
                        type="text" 
                        placeholder="Add comments or review notes..."
                        value={comments[rec._id] || ''}
                        onChange={(e) => handleCommentChange(rec._id, e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                          onClick={() => handleAction('regularize', rec._id, 'Rejected')}
                          className="btn btn-secondary"
                          style={{ flex: 1, borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                          disabled={actioning === rec._id}
                        >
                          <X size={16} />
                          <span>Reject</span>
                        </button>
                        <button 
                          onClick={() => handleAction('regularize', rec._id, 'Approved')}
                          className="btn btn-primary"
                          style={{ flex: 1 }}
                          disabled={actioning === rec._id}
                        >
                          <Check size={16} />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* RENDERING PENDING PROFILE EDITS */}
          {activeTab === 'profileEdits' && isHr && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {approvals.profileEdits?.length === 0 ? (
                <div style={{ color: '#9ca3af', textAlign: 'center', padding: '3rem' }}>No pending profile edit reviews.</div>
              ) : (
                approvals.profileEdits.map(req => (
                  <div key={req._id} className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Sensitive Profile Change
                      </div>
                      <h3 style={{ margin: '0.25rem 0', fontSize: '1.2rem' }}>{req.employeeId?.personal?.name}</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                        ID: {req.employeeId?.employeeId} | {req.employeeId?.employment?.designation}
                      </p>
                      
                      <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                        <span style={{ color: '#6b7280', display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Proposed Data Updates:</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {Object.entries(req.sensitiveFields || {}).map(([key, val]) => {
                            const fieldName = key.split('.')[1];
                            return (
                              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.5rem', borderRadius: '4px' }}>
                                <span style={{ textTransform: 'capitalize', color: '#9ca3af' }}>{fieldName}:</span>
                                <span style={{ color: '#f59e0b', fontWeight: 600 }}>{val}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
                      <label>HR Decision Comments</label>
                      <input 
                        type="text" 
                        placeholder="Add comments or review notes..."
                        value={comments[req._id] || ''}
                        onChange={(e) => handleCommentChange(req._id, e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                          onClick={() => handleAction('profile-edit', req._id, 'Rejected')}
                          className="btn btn-secondary"
                          style={{ flex: 1, borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                          disabled={actioning === req._id}
                        >
                          <X size={16} />
                          <span>Reject</span>
                        </button>
                        <button 
                          onClick={() => handleAction('profile-edit', req._id, 'Approved')}
                          className="btn btn-primary"
                          style={{ flex: 1 }}
                          disabled={actioning === req._id}
                        >
                          <Check size={16} />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Approvals;
