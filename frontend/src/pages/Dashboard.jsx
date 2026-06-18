import React from 'react';
import { useAuth } from '../hooks/useAuth';
import EmployeeDashboardPage from './employee/EmployeeDashboardPage';
import ManagerDashboardPage from './manager/ManagerDashboardPage';
import HRDashboardPage from './hr/HRDashboardPage';
import LeadershipDashboardPage from './leadership/LeadershipDashboardPage';

const Dashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ color: '#9ca3af', textAlign: 'center', marginTop: '4rem' }}>Syncing dashboard data...</div>;
  }

  if (!user) {
    return null;
  }

  switch (user.role) {
    case 'HR':
      return <HRDashboardPage />;
    case 'Manager':
      return <ManagerDashboardPage />;
    case 'Leadership':
      return <LeadershipDashboardPage />;
    case 'Employee':
    default:
      return <EmployeeDashboardPage />;
  }
};

export default Dashboard;
