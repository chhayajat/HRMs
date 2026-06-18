import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Calendar, Plus, Trash2 } from 'lucide-react';

const MyLeavesPage = () => {
  const { user, apiCall } = useAuth();
  const [balances, setBalances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const [leaveType, setLeaveType] = useState('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  
  const [errMessage, setErrMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchLeaveData = async () => {
    if (!user?.employeeProfileId) return;
    try {
      setLoading(true);
      const employeeId = user.employeeProfileId._id || user.employeeProfileId;
      
      const balRes = await apiCall(`/leaves/balances?employeeId=${employeeId}`);
      if (balRes.success) {
        setBalances(balRes.data);
      }

      const historyRes = await apiCall(`/leaves?employeeId=${employeeId}`);
      if (historyRes.success) {
        setLeaves(historyRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeaveData();
    }
  }, [user]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setErrMessage('');
    setSuccessMessage('');

    if (!startDate || !endDate || !reason) {
      return setErrMessage('Please fill in all leave request fields');
    }

    try {
      const res = await apiCall('/leaves', {
        method: 'POST',
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate,
          halfDay,
          reason
        })
      });

      if (res.success) {
        setSuccessMessage('Leave application submitted successfully.');
        setStartDate('');
        setEndDate('');
        setReason('');
        setHalfDay(false);
        fetchLeaveData();
      }
    } catch (err) {
      setErrMessage(err.message || 'Failed to submit leave request');
    }
  };

  const handleCancelLeave = async (reqId) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;
    try {
      const res = await apiCall(`/leaves/${reqId}/cancel`, {
        method: 'PUT'
      });
      if (res.success) {
        alert('Leave request cancelled');
        fetchLeaveData();
      }
    } catch (err) {
      alert(err.message || 'Failed to cancel request');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Leave Workspace</h1>
        <p style={{ color: '#9ca3af' }}>Apply for time-offs, check balances, and track approvals.</p>
      </div>

      {loading ? (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '4rem' }}>Synchronizing leave database...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h3 style={{ marginBottom: '1rem' }}>Remaining Allowances</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                {balances.map((bal, idx) => (
                  <div key={idx} className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>{bal.leaveType}</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#06b6d4', margin: '0.25rem 0' }}>
                      {bal.leaveType === 'Loss of Pay' ? 'LOP' : bal.allocated - bal.used - bal.pending}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                      Alloc: {bal.allocated}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ marginBottom: '1.25rem' }}>Apply for Time-Off</h3>
              
              {errMessage && (
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  {errMessage}
                </div>
              )}
              {successMessage && (
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label>Leave Category</label>
                  <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                    <option value="Casual">Casual Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Earned">Earned/Privileged Leave</option>
                    <option value="Loss of Pay">Loss of Pay (LOP)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label>Start Date</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label>End Date</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    id="halfDay"
                    checked={halfDay} 
                    onChange={(e) => setHalfDay(e.target.checked)} 
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="halfDay" style={{ margin: 0, cursor: 'pointer' }}>Apply for Half-Day</label>
                </div>

                <div>
                  <label>Statement of Reason</label>
                  <textarea 
                    rows="3" 
                    placeholder="Provide details about your absence..."
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)}
                    required 
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Submit Leave Request
                </button>
              </form>
            </div>
          </div>

          <div>
            <h3 style={{ marginBottom: '1rem' }}>Request Log</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No leaves requested yet.</td>
                    </tr>
                  ) : (
                    leaves.map(req => (
                      <tr key={req._id}>
                        <td><strong>{req.leaveType}</strong></td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#fff', fontWeight: 600 }}>
                              {new Date(req.startDate).toLocaleDateString()}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              to {new Date(req.endDate).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td>{req.reason}</td>
                        <td>
                          <span className={`badge badge-${
                            req.status === 'Approved' ? 'success' :
                            req.status === 'Pending' ? 'warning' :
                            req.status === 'Cancelled' ? 'info' : 'danger'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td>
                          {['Pending', 'Approved'].includes(req.status) && (
                            <button
                              onClick={() => handleCancelLeave(req._id)}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.5rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                              title="Cancel Leave"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyLeavesPage;
