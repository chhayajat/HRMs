import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Clock, Calendar, ArrowRight } from 'lucide-react';

const EmployeeDashboardPage = () => {
  const { user, apiCall } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punchState, setPunchState] = useState(null);
  const [punching, setPunching] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/reports/dashboard-summary');
      if (res.success) {
        setSummary(res.data);
      }

      if (user?.employeeProfileId) {
        const empId = user.employeeProfileId._id || user.employeeProfileId;
        const todayStr = new Date().toISOString().split('T')[0];
        const attRes = await apiCall(`/attendance?employeeId=${empId}&startDate=${todayStr}&endDate=${todayStr}`);
        if (attRes.success && attRes.data.length > 0) {
          setPunchState(attRes.data[0]);
        } else {
          setPunchState(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handlePunch = async (type) => {
    try {
      setPunching(true);
      const res = await apiCall('/attendance/punch', {
        method: 'POST',
        body: JSON.stringify({
          type,
          time: new Date(),
          ipAddress: '127.0.0.1 (Mocked)',
          location: 'Web App'
        })
      });
      if (res.success) {
        fetchData();
      }
    } catch (err) {
      alert(err.message || 'Punch operation failed');
    } finally {
      setPunching(false);
    }
  };

  if (loading) {
    return <div style={{ color: '#9ca3af', textAlign: 'center', marginTop: '4rem' }}>Calculating metrics...</div>;
  }

  const lastPunchType = punchState?.punches?.[punchState.punches.length - 1]?.type;
  const isPunchedIn = lastPunchType === 'In';

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Welcome, {user?.employeeProfileId?.personal?.name || user?.email}</h1>
          <p style={{ color: '#9ca3af' }}>Here's your portal dashboard for today.</p>
        </div>
        <span className="badge badge-info" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
          Role: Employee
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {user?.employeeProfileId && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Web Time Clock</h3>
                <Clock size={20} style={{ color: '#06b6d4' }} />
              </div>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                {isPunchedIn 
                  ? `Punched In since ${new Date(punchState.punches[0].time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                  : lastPunchType === 'Out' 
                    ? `Shift completed. Punched out at ${new Date(punchState.punches[punchState.punches.length-1].time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                    : 'You have not clocked in for today yet.'
                }
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              {!isPunchedIn ? (
                <button 
                  onClick={() => handlePunch('In')}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={punching || lastPunchType === 'Out'}
                >
                  {punching ? 'Clocking...' : 'Punch In'}
                </button>
              ) : (
                <button 
                  onClick={() => handlePunch('Out')}
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  disabled={punching}
                >
                  {punching ? 'Clocking...' : 'Punch Out'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
          <div>
            <h3 style={{ marginBottom: '1rem' }}>My Leave Balances</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {summary.leaveBalances?.map((bal, idx) => (
                <div key={idx} className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', color: '#9ca3af' }}>{bal.leaveType} Leave</h4>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Pending: {bal.pending} | Used: {bal.used}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06b6d4' }}>
                    {bal.leaveType === 'Loss of Pay' ? 'LOP' : bal.allocated - bal.used - bal.pending}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ marginBottom: '1rem' }}>Recent Leave Applications</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Date Range</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentLeaves?.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: '#9ca3af' }}>No leaves applied recently</td>
                    </tr>
                  ) : (
                    summary.recentLeaves?.map((req, idx) => (
                      <tr key={idx}>
                        <td><strong>{req.leaveType}</strong></td>
                        <td>
                          {new Date(req.startDate).toLocaleDateString()} to {new Date(req.endDate).toLocaleDateString()}
                        </td>
                        <td>{req.reason}</td>
                        <td>
                          <span className={`badge badge-${
                            req.status === 'Approved' ? 'success' : 
                            req.status === 'Pending' ? 'warning' : 'danger'
                          }`}>
                            {req.status}
                          </span>
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

export default EmployeeDashboardPage;
