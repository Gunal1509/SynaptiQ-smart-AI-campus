import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { nodeApi, authService } from '../services/api';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [profile, setProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  const email = authService.getEmail();
  const currentUser = authService.getUser();
  const isAdmin = currentUser && currentUser.role === 'admin';

  const fetchNotifications = () => {
    if (authService.isAuthenticated()) {
      nodeApi.get('/notifications')
        .then((res) => {
          if (res.data) {
            setLiveNotifications(res.data.notifications || []);
            setUnreadNotifsCount(res.data.unread_count || 0);
          }
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    if (email) {
      nodeApi.get(`/profile/${email}`)
        .then((res) => {
          if (res.data && res.data.student_name) {
            setProfile(res.data);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch profile", err);
        });

      fetchNotifications();
    }
  }, [email]);

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'bi-grid-1x2' },
    { name: 'Upload Syllabus', path: '/uploads', icon: 'bi-cloud-arrow-up' },
    { name: 'RAG Assistant', path: '/rag', icon: 'bi-file-earmark-text' },
    { name: 'AI Copilot', path: '/aiassisstant', icon: 'bi-chat-dots' },
    { name: 'Exam Readiness', path: '/examsprint', icon: 'bi-lightning-charge' },
    { name: 'Timetable', path: '/timetable', icon: 'bi-calendar3' },
    { name: 'Profile', path: '/profiles', icon: 'bi-person-badge' },
    ...(isAdmin ? [{ name: 'Admin Portal', path: '/admin', icon: 'bi-shield-lock-fill', isAdminItem: true }] : [])
  ];

  const markAllNotificationsRead = async () => {
    try {
      await nodeApi.put('/notifications/read-all');
      setUnreadNotifsCount(0);
      setLiveNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {}
  };

  const markSingleRead = async (notifId) => {
    try {
      await nodeApi.put(`/notifications/${notifId}/read`);
      setLiveNotifications(prev => prev.map(n => n.id === notifId ? ({ ...n, is_read: true }) : n));
      setUnreadNotifsCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const getPageTitle = () => {
    const current = navItems.find(item => item.path.toLowerCase() === location.pathname.toLowerCase());
    return current ? current.name : 'Campus Portal';
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark opacity-50 d-lg-none"
          style={{ zIndex: 1040 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-white border-end d-flex flex-column ${
          sidebarOpen ? 'd-flex position-fixed' : 'd-none d-lg-flex position-sticky'
        } top-0 start-0`}
        style={{
          width: '260px',
          minWidth: '260px',
          maxWidth: '260px',
          height: '100vh',
          zIndex: 1050,
          flexShrink: 0,
        }}
      >
        {/* Brand */}
        <div className="p-4 border-bottom d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <div
              className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center shadow-sm"
              style={{ width: '38px', height: '38px', backgroundColor: '#2563eb' }}
            >
              <i className="bi bi-mortarboard-fill fs-5"></i>
            </div>
            <div>
              <span className="fw-bold fs-5 text-dark tracking-tight">Synaptic<span className="text-primary">Q</span></span>
              <div className="text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>CAMPUS COPILOT</div>
            </div>
          </div>
          <button
            className="btn btn-sm btn-light d-lg-none text-muted"
            onClick={() => setSidebarOpen(false)}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Navigation Links */}
        <div className="p-3 flex-grow-1 overflow-auto">
          <div className="text-uppercase text-muted fw-semibold px-3 mb-2" style={{ fontSize: '0.68rem', letterSpacing: '0.08em' }}>
            Main Menu
          </div>
          <ul className="nav nav-pills flex-column gap-1">
            {navItems.map((item) => (
              <li className="nav-item" key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 fw-medium transition-all ${
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-secondary hover-bg-light'
                    }`
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? '#2563eb' : 'transparent',
                    fontSize: '0.9rem',
                  })}
                >
                  <i className={`bi ${item.icon} fs-5`}></i>
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Student Profile Quick View at Bottom */}
        <div className="p-3 border-top bg-light">
          <div className="d-flex align-items-center justify-content-between p-2 rounded-3 bg-white border shadow-sm">
            <div className="d-flex align-items-center gap-2 overflow-hidden" onClick={() => navigate('/profiles')} style={{ cursor: 'pointer' }}>
              <img
                src={profile?.profile_photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"}
                alt="Avatar"
                className="rounded-circle object-fit-cover border"
                style={{ width: '36px', height: '36px' }}
                onError={(e) => {
                  e.target.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
                }}
              />
              <div className="overflow-hidden">
                <div className="fw-semibold text-dark text-truncate" style={{ fontSize: '0.85rem' }}>
                  {profile?.student_name || email?.split('@')[0] || 'Student'}
                </div>
                <div className="text-muted text-truncate" style={{ fontSize: '0.72rem' }}>
                  {profile?.department ? `${profile.department} • ${profile.year || ''}` : email}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-sm btn-outline-danger border-0 p-1 rounded-2"
              title="Sign Out"
            >
              <i className="bi bi-box-arrow-right fs-5"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0, overflowX: 'hidden' }}>
        {/* Top Navbar */}
        <header className="bg-white border-bottom sticky-top px-4 py-3 d-flex align-items-center justify-content-between shadow-xs">
          <div className="d-flex align-items-center gap-3">
            <button
              className="btn btn-light border d-lg-none"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="bi bi-list fs-5"></i>
            </button>
            <div>
              <h1 className="h5 fw-bold text-dark mb-0">{getPageTitle()}</h1>
              <span className="text-muted" style={{ fontSize: '0.78rem' }}>AI Smart Campus Portal</span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <span className="badge bg-light text-secondary border px-3 py-2 rounded-pill d-none d-sm-inline-flex align-items-center gap-1">
              <span className="p-1 bg-success rounded-circle"></span>
              Academic Session 2025–26
            </span>

            {/* Live Notification Bell */}
            <div className="position-relative">
              <button
                className="btn btn-light border rounded-circle position-relative p-2 d-flex align-items-center justify-content-center shadow-xs"
                style={{ width: '40px', height: '40px' }}
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) fetchNotifications();
                }}
                aria-label="Notifications"
                title="Notifications"
              >
                <i className="bi bi-bell text-secondary fs-6"></i>
                {unreadNotifsCount > 0 && (
                  <span
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light"
                    style={{ fontSize: '0.65rem' }}
                  >
                    {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                    <span className="visually-hidden">unread notifications</span>
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div
                  className="card position-absolute end-0 mt-2 shadow-lg border-0 rounded-4 overflow-hidden"
                  style={{ width: '340px', zIndex: 1100 }}
                >
                  <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-bell-fill text-primary"></i>
                      <span className="fw-bold text-dark">Notifications</span>
                    </div>
                    {unreadNotifsCount > 0 ? (
                      <button
                        className="btn btn-sm btn-link text-primary text-decoration-none p-0 small fw-semibold"
                        onClick={markAllNotificationsRead}
                      >
                        Mark all read
                      </button>
                    ) : (
                      <span className="badge bg-light text-secondary border rounded-pill small">All caught up</span>
                    )}
                  </div>

                  <div className="card-body p-2" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {liveNotifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markSingleRead(n.id)}
                        className={`p-2 border-bottom rounded-3 mb-1 transition-all ${!n.is_read ? 'bg-primary-subtle border-primary-subtle' : 'bg-light'}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className={`badge rounded-pill ${n.type === 'warning' ? 'bg-warning-subtle text-warning-emphasis' : n.type === 'urgent' ? 'bg-danger text-white' : 'bg-info-subtle text-info-emphasis'}`} style={{ fontSize: '0.68rem' }}>
                            {n.type?.toUpperCase()}
                          </span>
                          {!n.is_read && (
                            <span className="badge bg-primary rounded-circle p-1" title="Unread"></span>
                          )}
                          <small className="text-muted ms-auto" style={{ fontSize: '0.7rem' }}>
                            {n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Recent'}
                          </small>
                        </div>
                        <h6 className="mb-1 text-dark small fw-bold">{n.title}</h6>
                        <p className="mb-0 text-secondary small" style={{ fontSize: '0.8rem' }}>{n.message}</p>
                      </div>
                    ))}

                    {liveNotifications.length === 0 && (
                      <div className="text-center py-4 text-muted small">
                        <i className="bi bi-bell-slash fs-4 d-block mb-1 opacity-50"></i>
                        No new notifications.
                      </div>
                    )}
                  </div>

                  <div className="card-footer bg-white border-top text-center py-2 d-flex justify-content-between align-items-center">
                    <button
                      className="btn btn-sm btn-link text-decoration-none text-muted small p-0"
                      onClick={() => setShowNotifications(false)}
                    >
                      Close
                    </button>
                    {isAdmin && (
                      <NavLink
                        to="/admin"
                        onClick={() => setShowNotifications(false)}
                        className="btn btn-sm btn-link text-decoration-none text-primary small p-0 fw-semibold"
                      >
                        Dispatch Alert →
                      </NavLink>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout button */}
            <button
              className="btn btn-outline-secondary btn-sm px-3 rounded-3 d-none d-sm-flex align-items-center gap-2"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-grow-1 p-3 p-md-4 p-xl-5">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
