import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Clock, ClipboardList, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const ManagerDashboardPage = () => {
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
          <p style={{ color: '#9ca3af' }}>Here's your team manager dashboard for today.</p>
        </div>
        <span className="badge badge-info" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
          Role: Manager
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

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Task Approvals</h3>
              <ClipboardList size={20} style={{ color: '#6366f1' }} />
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', margin: '0.5rem 0' }}>
              {summary?.pendingApprovals || 0}
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Pending reviews require your approval.</p>
          </div>
          <Link to="/approvals" className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>
            <span>Open Approval Center</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {summary && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>Team Attendance Status Today</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
            <div className="table-container">
              <h4 style={{ padding: '1rem 1rem 0 1rem', fontSize: '1rem' }}>Team Members ({summary.teamSize || 0})</h4>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Designation</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.teamList?.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: '#9ca3af' }}>No reporting team members found</td>
                    </tr>
                  ) : (
                    summary.teamList?.map((member, idx) => (
                      <tr key={idx}>
                        <td><strong>{member.name}</strong></td>
                        <td>{member.department}</td>
                        <td>{member.designation}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h4 style={{ marginBottom: '1rem' }}>Overview</h4>
              <div style={{ width: '100%', height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Present', value: (summary.todayAttendance?.present || 0) + (summary.todayAttendance?.late || 0) },
                        { name: 'Absent', value: summary.todayAttendance?.absent || 0 },
                        { name: 'On Leave', value: summary.todayAttendance?.onLeave || 0 }
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', marginTop: '1rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                  Present ({(summary.todayAttendance?.present || 0) + (summary.todayAttendance?.late || 0)})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                  Absent ({summary.todayAttendance?.absent || 0})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                  Leave ({summary.todayAttendance?.onLeave || 0})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboardPage;
