import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { store } from './services/store';
import { loadMe } from './services/slices/authSlice';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import Dashboard from './pages/Dashboard';
import DirectoryPage from './pages/employee/DirectoryPage';
import MyAttendancePage from './pages/employee/MyAttendancePage';
import MyLeavesPage from './pages/employee/MyLeavesPage';
import TeamApprovalsPage from './pages/manager/TeamApprovalsPage';
import EmployeeManagementPage from './pages/hr/EmployeeManagementPage';
import OrganizationReportsPage from './pages/leadership/OrganizationReportsPage';
import AIAnalyticsHubPage from './pages/leadership/AIAnalyticsHubPage';

const AppWrapper = () => {
  const dispatch = useDispatch();
  const token = localStorage.getItem('hrms_token');

  useEffect(() => {
    if (token) {
      dispatch(loadMe(token));
    }
  }, [dispatch, token]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Protected Routes using Sidebar Layout */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Dashboard available to all logged in users */}
        <Route index element={<Dashboard />} />
        
        {/* Directory available to all */}
        <Route path="directory" element={<DirectoryPage />} />

        {/* Personal Attendance & Leaves logs available to all */}
        <Route path="attendance" element={<MyAttendancePage />} />
        <Route path="leaves" element={<MyLeavesPage />} />

        {/* Approvals available to Managers and HR */}
        <Route path="approvals" element={
          <ProtectedRoute allowedRoles={['Manager', 'HR']}>
            <TeamApprovalsPage />
          </ProtectedRoute>
        } />

        {/* Employee Management CRUD available to HR only */}
        <Route path="employees" element={
          <ProtectedRoute allowedRoles={['HR']}>
            <EmployeeManagementPage />
          </ProtectedRoute>
        } />

        {/* Organization Analytics available to HR and Leadership */}
        <Route path="reports" element={
          <ProtectedRoute allowedRoles={['HR', 'Leadership']}>
            <OrganizationReportsPage />
          </ProtectedRoute>
        } />

        <Route path="ai-analytics" element={
          <ProtectedRoute allowedRoles={['HR', 'Leadership']}>
            <AIAnalyticsHubPage />
          </ProtectedRoute>
        } />
      </Route>

      {/* Catch-all Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppWrapper />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
