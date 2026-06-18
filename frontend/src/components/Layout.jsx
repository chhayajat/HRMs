import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { 
  LayoutDashboard, 
  Users, 
  CalendarClock, 
  FileSpreadsheet, 
  GitPullRequest, 
  Settings, 
  BarChart3, 
  LogOut, 
  Bell, 
  Menu, 
  User as UserIcon,
  ChevronRight,
  Sparkles
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, getNotifications, readNotification, readAllNotifications } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (user) {
      getNotifications();
      const interval = setInterval(getNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside listener for notifications
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    readAllNotifications();
  };

  const handleNotificationClick = (notif) => {
    if (!notif.read) {
      readNotification(notif._id);
    }
    setShowNotifDropdown(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define sidebar links based on role
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Employee', 'Manager', 'HR', 'Leadership'] },
    { name: 'Directory & Org Chart', path: '/directory', icon: Users, roles: ['Employee', 'Manager', 'HR', 'Leadership'] },
    { name: 'My Attendance', path: '/attendance', icon: CalendarClock, roles: ['Employee', 'Manager', 'HR', 'Leadership'] },
    { name: 'My Leaves', path: '/leaves', icon: FileSpreadsheet, roles: ['Employee', 'Manager', 'HR', 'Leadership'] },
    { name: 'Approval Center', path: '/approvals', icon: GitPullRequest, roles: ['Manager', 'HR'] },
    { name: 'Employee Management', path: '/employees', icon: Settings, roles: ['HR'] },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3, roles: ['HR', 'Leadership'] },
    { name: 'AI Analytics Hub', path: '/ai-analytics', icon: Sparkles, roles: ['HR', 'Leadership'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19' }}>
      
      {/* Sidebar */}
      <aside style={{
        width: '280px',
        backgroundColor: '#111827',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 10
      }}>
        {/* Brand Logo */}
        <div style={{
          padding: '2rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: '#fff',
            fontSize: '1.25rem',
            boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)'
          }}>
            AG
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', lineHeight: 1.2, fontWeight: 800, color: '#fff' }}>Antigravity</h1>
            <span style={{ fontSize: '0.75rem', color: '#06b6d4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>HRMS ENGINE</span>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto' }}>
          {filteredMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  color: isActive ? '#fff' : '#9ca3af',
                  backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.925rem',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <Icon size={18} style={{ color: isActive ? '#6366f1' : '#9ca3af' }} />
                <span>{item.name}</span>
                {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto', color: '#6366f1' }} />}
              </Link>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div style={{
          padding: '1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: 'rgba(255, 255, 255, 0.01)'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(99, 102, 241, 0.3)'
          }}>
            {user?.employeeProfileId?.personal?.photo ? (
              <img src={user.employeeProfileId.personal.photo} alt="User Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
            ) : (
              <UserIcon size={18} style={{ color: '#9ca3af' }} />
            )}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.employeeProfileId?.personal?.name || user?.email}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase' }}>
              {user?.role}
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* Header bar */}
        <header style={{
          height: '70px',
          backgroundColor: '#111827',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 9
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Organization</span>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#06b6d4' }}>{user?.tenantName || 'Antigravity Workspace'}</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            
            {/* Notification bell and dropdown */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: '8px',
                  borderRadius: '50%',
                  backgroundColor: showNotifDropdown ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '18px',
                    height: '18px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {showNotifDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '45px',
                  right: 0,
                  width: '320px',
                  backgroundColor: '#1f2937',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                  zIndex: 20,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
                        No notifications
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif._id}
                          onClick={() => handleNotificationClick(notif)}
                          style={{
                            padding: '1rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                            backgroundColor: notif.read ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <div style={{ fontSize: '0.85rem', fontWeight: notif.read ? 600 : 700, color: notif.read ? '#d1d5db' : '#fff' }}>
                            {notif.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                            {notif.message}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User status info pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10b981'
              }} />
              <span style={{ fontSize: '0.8rem', color: '#d1d5db', fontWeight: 600 }}>Active Logged In</span>
            </div>
            
          </div>
        </header>

        {/* Content Body */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export default Layout;
