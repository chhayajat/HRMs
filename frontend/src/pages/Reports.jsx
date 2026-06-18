import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileDown, Calendar, Search, ListFilter, BarChart4 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Reports = () => {
  const { apiCall } = useAuth();
  const [reportType, setReportType] = useState('headcount'); // headcount, attendance, leaves
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // default last 30 days
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await apiCall(`/reports/analytics?type=${reportType}&startDate=${startDate}&endDate=${endDate}`);
      if (res.success) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType, startDate, endDate]);

  // Export report as CSV file
  const handleExportCSV = () => {
    if (!reportData) return;
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    if (reportType === 'headcount') {
      csvContent += 'Metric,Value\r\n';
      csvContent += `Active Employees,${reportData.activeCount}\r\n`;
      csvContent += `Probation,${reportData.probationCount}\r\n`;
      csvContent += `Onboarding,${reportData.onboardingCount}\r\n`;
      csvContent += `Terminated,${reportData.terminatedCount}\r\n`;
      csvContent += `Total Workforce,${reportData.total}\r\n`;
    } else if (reportType === 'attendance') {
      csvContent += 'Date,Employee ID,Employee Name,Department,First In,Last Out,Hours Worked,Status\r\n';
      reportData.forEach(row => {
        const inPunch = row.punches?.find(p => p.type === 'In')?.time;
        const outPunch = [...(row.punches || [])].reverse().find(p => p.type === 'Out')?.time;
        
        csvContent += `${row.date},${row.employeeId?.employeeId},"${row.employeeId?.personal?.name}","${row.employeeId?.employment?.department}",${inPunch ? new Date(inPunch).toLocaleTimeString() : '--'},${outPunch ? new Date(outPunch).toLocaleTimeString() : '--'},${row.totalHours},${row.status}\r\n`;
      });
    } else if (reportType === 'leaves') {
      csvContent += 'Employee Name,Leave Type,Start Date,End Date,Reason,Status\r\n';
      reportData.forEach(row => {
        csvContent += `"${row.employeeId?.personal?.name}",${row.leaveType},${new Date(row.startDate).toLocaleDateString()},${new Date(row.endDate).toLocaleDateString()},"${row.reason}",${row.status}\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HRMS_Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Reports & Analytics</h1>
          <p style={{ color: '#9ca3af' }}>Generate summaries for headcount, attendance sheets, and leaves logs.</p>
        </div>

        <button className="btn btn-secondary" onClick={handleExportCSV} disabled={loading || !reportData}>
          <FileDown size={18} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Selector and filters */}
      <div className="glass-card" style={{
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        padding: '1.25rem'
      }}>
        <div style={{ minWidth: '180px' }}>
          <label>Report Type</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="headcount">Workforce Headcount</option>
            <option value="attendance">Muster Attendance Roll</option>
            <option value="leaves">Leave Management Register</option>
          </select>
        </div>

        {reportType !== 'headcount' && (
          <>
            <div>
              <label>From Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label>To Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '4rem' }}>Running report algorithms...</div>
      ) : (
        <>
          {/* workforce headcount rendering */}
          {reportType === 'headcount' && reportData && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Workforce Distribution</h3>
                
                <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.25rem' }}>
                  <span style={{ fontWeight: 600 }}>Active Employees</span>
                  <strong style={{ color: '#10b981' }}>{reportData.activeCount}</strong>
                </div>
                <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.25rem' }}>
                  <span style={{ fontWeight: 600 }}>On Probation</span>
                  <strong style={{ color: '#f59e0b' }}>{reportData.probationCount}</strong>
                </div>
                <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.25rem' }}>
                  <span style={{ fontWeight: 600 }}>Onboarding Pipeline</span>
                  <strong style={{ color: '#06b6d4' }}>{reportData.onboardingCount}</strong>
                </div>
                <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.25rem' }}>
                  <span style={{ fontWeight: 600 }}>Terminated / Left</span>
                  <strong style={{ color: '#ef4444' }}>{reportData.terminatedCount}</strong>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Total Workforce</span>
                  <strong style={{ fontSize: '1.1rem', color: '#6366f1' }}>{reportData.total}</strong>
                </div>
              </div>

              {/* Headcount Bar Chart */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: '1.5rem' }}><span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BarChart4 size={18} /> Workforce Metrics</span></h3>
                <div style={{ width: '100%', height: '250px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Active', count: reportData.activeCount },
                        { name: 'Probation', count: reportData.probationCount },
                        { name: 'Onboarding', count: reportData.onboardingCount },
                        { name: 'Left', count: reportData.terminatedCount }
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: 'rgba(255,255,255,0.08)' }} />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Attendance sheet rendering */}
          {reportType === 'attendance' && reportData && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>First In</th>
                    <th>Last Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No attendance logs found in date range.</td>
                    </tr>
                  ) : (
                    reportData.map((row, idx) => {
                      const inTime = row.punches?.find(p => p.type === 'In')?.time;
                      const outTime = [...(row.punches || [])].reverse().find(p => p.type === 'Out')?.time;
                      return (
                        <tr key={idx}>
                          <td><strong>{row.date}</strong></td>
                          <td>{row.employeeId?.employeeId}</td>
                          <td><strong>{row.employeeId?.personal?.name}</strong></td>
                          <td>{row.employeeId?.employment?.department}</td>
                          <td>{inTime ? new Date(inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                          <td>{outTime ? new Date(outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                          <td>{row.totalHours ? `${row.totalHours} hrs` : '--'}</td>
                          <td>
                            <span className={`badge badge-${
                              row.status === 'Present' ? 'success' :
                              row.status === 'Late' ? 'info' :
                              row.status === 'Half-Day' ? 'warning' : 'danger'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Leaves log rendering */}
          {reportType === 'leaves' && reportData && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Leave Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No leaves requested in date range.</td>
                    </tr>
                  ) : (
                    reportData.map((row, idx) => (
                      <tr key={idx}>
                        <td><strong>{row.employeeId?.personal?.name}</strong></td>
                        <td>{row.leaveType}</td>
                        <td>{new Date(row.startDate).toLocaleDateString()}</td>
                        <td>{new Date(row.endDate).toLocaleDateString()}</td>
                        <td>{row.reason}</td>
                        <td>
                          <span className={`badge badge-${
                            row.status === 'Approved' ? 'success' :
                            row.status === 'Pending' ? 'warning' :
                            row.status === 'Cancelled' ? 'info' : 'danger'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
