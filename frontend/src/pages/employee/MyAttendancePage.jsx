import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Clock, CalendarCheck, HelpCircle, CheckCircle, PlusCircle } from 'lucide-react';

const MyAttendancePage = () => {
  const { user, apiCall } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showRegModal, setShowRegModal] = useState(false);
  const [regDate, setRegDate] = useState('');
  const [regReason, setRegReason] = useState('');
  const [regInTime, setRegInTime] = useState('09:00');
  const [regOutTime, setRegOutTime] = useState('18:00');
  const [regMessage, setRegMessage] = useState('');
  const [regErr, setRegErr] = useState('');

  const fetchAttendanceHistory = async () => {
    if (!user?.employeeProfileId) return;
    try {
      setLoading(true);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startStr = startOfMonth.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      const res = await apiCall(`/attendance?employeeId=${user.employeeProfileId._id || user.employeeProfileId}&startDate=${startStr}&endDate=${todayStr}`);
      if (res.success) {
        setHistory(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAttendanceHistory();
    }
  }, [user]);

  const handleOpenRegularize = (dateStr) => {
    setRegDate(dateStr || new Date().toISOString().split('T')[0]);
    setRegReason('');
    setRegInTime('09:00');
    setRegOutTime('18:00');
    setRegMessage('');
    setRegErr('');
    setShowRegModal(true);
  };

  const handleRegularizeSubmit = async (e) => {
    e.preventDefault();
    setRegErr('');
    setRegMessage('');

    if (!regDate || !regReason || !regInTime || !regOutTime) {
      return setRegErr('Please fill in all regularization details');
    }

    try {
      const punchInDate = new Date(regDate);
      const [inH, inM] = regInTime.split(':').map(Number);
      punchInDate.setHours(inH, inM, 0);

      const punchOutDate = new Date(regDate);
      const [outH, outM] = regOutTime.split(':').map(Number);
      punchOutDate.setHours(outH, outM, 0);

      if (punchInDate >= punchOutDate) {
        return setRegErr('Punch Out time must be after Punch In time');
      }

      const res = await apiCall('/attendance/regularize', {
        method: 'POST',
        body: JSON.stringify({
          date: regDate,
          reason: regReason,
          requestedPunches: [
            { type: 'In', time: punchInDate },
            { type: 'Out', time: punchOutDate }
          ]
        })
      });

      if (res.success) {
        setRegMessage('Regularization request submitted successfully for approval.');
        fetchAttendanceHistory();
        setTimeout(() => setShowRegModal(false), 1500);
      }
    } catch (err) {
      setRegErr(err.message || 'Request failed');
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>My Attendance History</h1>
          <p style={{ color: '#9ca3af' }}>Check your daily work hours, punch timings, and log corrections.</p>
        </div>

        <button className="btn btn-secondary" onClick={() => handleOpenRegularize('')}>
          <PlusCircle size={18} />
          <span>Request Regularization</span>
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '4rem' }}>Syncing punch records...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>First In</th>
                <th>Last Out</th>
                <th>Work Hours</th>
                <th>Status</th>
                <th>Correction status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#9ca3af' }}>No punches recorded for this month.</td>
                </tr>
              ) : (
                history.map(rec => {
                  const inPunch = rec.punches?.find(p => p.type === 'In');
                  const outPunch = [...(rec.punches || [])].reverse().find(p => p.type === 'Out');
                  
                  return (
                    <tr key={rec._id}>
                      <td><strong>{new Date(rec.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</strong></td>
                      <td>{inPunch ? new Date(inPunch.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                      <td>{outPunch ? new Date(outPunch.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                      <td>{rec.totalHours ? `${rec.totalHours} hrs` : '--'}</td>
                      <td>
                        <span className={`badge badge-${
                          rec.status === 'Present' ? 'success' :
                          rec.status === 'Late' ? 'info' :
                          rec.status === 'Half-Day' ? 'warning' : 'danger'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td>
                        {rec.regularization?.requested ? (
                          <span className="badge badge-warning">Pending Review</span>
                        ) : rec.regularization?.status === 'Approved' ? (
                          <span className="badge badge-success">Approved</span>
                        ) : rec.regularization?.status === 'Rejected' ? (
                          <span className="badge badge-danger">Rejected</span>
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>None</span>
                        )}
                      </td>
                      <td>
                        {!rec.regularization?.requested && rec.status !== 'On Leave' && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            onClick={() => handleOpenRegularize(rec.date)}
                          >
                            Correct Log
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Regularization Modal */}
      {showRegModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-container" style={{
            width: '100%',
            maxWidth: '500px',
            padding: '2.5rem',
            backgroundColor: '#111827'
          }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.4rem' }}>Attendance Regularization</h2>
            
            {regErr && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                {regErr}
              </div>
            )}
            {regMessage && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                {regMessage}
              </div>
            )}

            <form onSubmit={handleRegularizeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label>Target Date</label>
                <input 
                  type="date" 
                  value={regDate} 
                  onChange={(e) => setRegDate(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>Requested Check-In</label>
                  <input 
                    type="time" 
                    value={regInTime} 
                    onChange={(e) => setRegInTime(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label>Requested Check-Out</label>
                  <input 
                    type="time" 
                    value={regOutTime} 
                    onChange={(e) => setRegOutTime(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div>
                <label>Reason / Clarification</label>
                <textarea 
                  rows="3" 
                  placeholder="e.g. Forgot ID badge, Client meeting offsite, etc."
                  value={regReason} 
                  onChange={(e) => setRegReason(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRegModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAttendancePage;
