import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#ef4444', '#3b82f6'];

const LeadershipDashboardPage = () => {
  const { user, apiCall } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/reports/dashboard-summary');
      if (res.success) {
        setSummary(res.data);
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

  if (loading) {
    return <div style={{ color: '#9ca3af', textAlign: 'center', marginTop: '4rem' }}>Calculating metrics...</div>;
  }

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
          <p style={{ color: '#9ca3af' }}>Here's your leadership analytics dashboard overview.</p>
        </div>
        <span className="badge badge-info" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
          Role: Leadership
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Active Headcount</h3>
              <Users size={20} style={{ color: '#10b981' }} />
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', margin: '0.5rem 0' }}>
              {summary?.totalEmployees || 0}
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Active staff in directory.</p>
          </div>
        </div>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ marginBottom: '1.5rem', alignSelf: 'flex-start' }}>Organization Attendance Today</h3>
            <div style={{ width: '100%', height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Present', value: summary.todayAttendance?.present || 0 },
                      { name: 'Late Check-in', value: summary.todayAttendance?.late || 0 },
                      { name: 'On Leave', value: summary.todayAttendance?.onLeave || 0 },
                      { name: 'Absent', value: summary.todayAttendance?.absent || 0 }
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {[
                      { name: 'Present', fill: '#10b981' },
                      { name: 'Late Check-in', fill: '#3b82f6' },
                      { name: 'On Leave', fill: '#f59e0b' },
                      { name: 'Absent', fill: '#ef4444' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem' }}>Department Allocation</h3>
            <div style={{ width: '100%', height: '220px' }}>
              {summary.departmentStats?.length === 0 ? (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '3rem 0' }}>No employees seeded</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.departmentStats}
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      dataKey="count"
                      nameKey="name"
                      label
                    >
                      {summary.departmentStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadershipDashboardPage;
