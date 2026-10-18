import { useState, useEffect } from 'react';
import Layout from './Layout';
import { nodeApi, authService } from '../services/api';

function AdminPortal() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState({ text: '', type: '' });

  // Users Management State
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Login Activity State
  const [loginLogs, setLoginLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [notifForm, setNotifForm] = useState({
    recipient_email: 'ALL',
    title: '',
    message: '',
    type: 'info'
  });

  // Announcements State
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [editingAnnounce, setEditingAnnounce] = useState(null);
  const [announceForm, setAnnounceForm] = useState({
    title: '',
    content: '',
    category: 'General',
    priority: 'medium',
    is_pinned: false,
    is_active: true
  });

  // Database Explorer State
  const [dbData, setDbData] = useState(null);
  const [activeDbTab, setActiveDbTab] = useState('mysql_users');

  // System Settings State
  const [settings, setSettings] = useState({
    require_admin_approval: 'false',
    allow_signups: 'true',
    maintenance_mode: 'false',
    announcement_banner_enabled: 'true'
  });

  const currentUser = authService.getUser();

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg({ text: '', type: '' }), 4000);
  };

  // Initial Data Fetch
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, logsRes, notifsRes, annRes, setRes] = await Promise.all([
        nodeApi.get('/admin/stats').catch(() => ({ data: null })),
        nodeApi.get('/admin/users').catch(() => ({ data: [] })),
        nodeApi.get('/admin/login-activity').catch(() => ({ data: [] })),
        nodeApi.get('/admin/notifications').catch(() => ({ data: [] })),
        nodeApi.get('/admin/announcements').catch(() => ({ data: [] })),
        nodeApi.get('/admin/settings').catch(() => ({ data: [] }))
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      if (logsRes.data) setLoginLogs(logsRes.data);
      if (notifsRes.data) setNotifications(notifsRes.data);
      if (annRes.data) setAnnouncements(annRes.data);

      if (setRes.data && Array.isArray(setRes.data)) {
        const setMap = {};
        setRes.data.forEach(s => {
          setMap[s.setting_key] = s.setting_value;
        });
        setSettings(prev => ({ ...prev, ...setMap }));
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      showToast('Failed to load some admin data.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch Database Data for Explorer Tab
  const fetchDatabaseExplorer = async () => {
    try {
      const res = await nodeApi.get('/admin/database-data');
      if (res.data) setDbData(res.data);
    } catch (err) {
      console.error('Failed to load database explorer data:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'database' && !dbData) {
      fetchDatabaseExplorer();
    }
  }, [activeTab]);

  // ----------------------------------------------------------------
  // USER ACTIONS
  // ----------------------------------------------------------------
  const handleUpdateStatus = async (userId, newStatus) => {
    setActionLoading(true);
    try {
      await nodeApi.put(`/admin/users/${userId}/status`, { status: newStatus });
      showToast(`User status set to ${newStatus}.`, 'success');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      // Refresh stats
      const statsRes = await nodeApi.get('/admin/stats');
      setStats(statsRes.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating status', 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    setActionLoading(true);
    try {
      await nodeApi.put(`/admin/users/${userId}/role`, { role: newRole });
      showToast(`User role updated to ${newRole}.`, 'success');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating role', 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userName}"?`)) return;
    setActionLoading(true);
    try {
      await nodeApi.delete(`/admin/users/${userId}`);
      showToast('User deleted successfully.', 'info');
      setUsers(prev => prev.filter(u => u.id !== userId));
      const statsRes = await nodeApi.get('/admin/stats');
      setStats(statsRes.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error deleting user', 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------------------
  // NOTIFICATION ACTIONS
  // ----------------------------------------------------------------
  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifForm.title.trim() || !notifForm.message.trim()) {
      showToast('Please provide both title and message.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      const res = await nodeApi.post('/admin/notifications', notifForm);
      showToast(res.data?.message || 'Notification sent!', 'success');
      setNotifForm({ recipient_email: 'ALL', title: '', message: '', type: 'info' });
      // Refresh notifications list
      const nRes = await nodeApi.get('/admin/notifications');
      setNotifications(nRes.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send notification', 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteNotification = async (notifId) => {
    try {
      await nodeApi.delete(`/admin/notifications/${notifId}`);
      showToast('Notification deleted', 'info');
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      showToast('Failed to delete notification', 'danger');
    }
  };

  // ----------------------------------------------------------------
  // ANNOUNCEMENT ACTIONS
  // ----------------------------------------------------------------
  const openNewAnnounceModal = () => {
    setEditingAnnounce(null);
    setAnnounceForm({
      title: '',
      content: '',
      category: 'General',
      priority: 'medium',
      is_pinned: false,
      is_active: true
    });
    setShowAnnounceModal(true);
  };

  const openEditAnnounceModal = (ann) => {
    setEditingAnnounce(ann);
    setAnnounceForm({
      title: ann.title,
      content: ann.content,
      category: ann.category || 'General',
      priority: ann.priority || 'medium',
      is_pinned: !!ann.is_pinned,
      is_active: !!ann.is_active
    });
    setShowAnnounceModal(true);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!announceForm.title.trim() || !announceForm.content.trim()) {
      showToast('Title and content are required.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      if (editingAnnounce) {
        await nodeApi.put(`/admin/announcements/${editingAnnounce.id}`, announceForm);
        showToast('Announcement updated successfully!', 'success');
      } else {
        await nodeApi.post('/admin/announcements', announceForm);
        showToast('Announcement published successfully!', 'success');
      }
      setShowAnnounceModal(false);
      const aRes = await nodeApi.get('/admin/announcements');
      setAnnouncements(aRes.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving announcement', 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (annId) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await nodeApi.delete(`/admin/announcements/${annId}`);
      showToast('Announcement deleted', 'info');
      setAnnouncements(prev => prev.filter(a => a.id !== annId));
    } catch (err) {
      showToast('Error deleting announcement', 'danger');
    }
  };

  const handleToggleAnnounceActive = async (ann) => {
    try {
      await nodeApi.put(`/admin/announcements/${ann.id}`, {
        ...ann,
        is_active: !ann.is_active
      });
      setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, is_active: !a.is_active } : a));
      showToast(`Announcement ${!ann.is_active ? 'activated' : 'deactivated'}`, 'info');
    } catch (err) {
      showToast('Failed to toggle status', 'danger');
    }
  };

  // ----------------------------------------------------------------
  // SETTINGS ACTIONS
  // ----------------------------------------------------------------
  const handleToggleSetting = async (key) => {
    const currentVal = settings[key] === 'true';
    const newVal = currentVal ? 'false' : 'true';
    const updated = { ...settings, [key]: newVal };
    setSettings(updated);

    try {
      await nodeApi.put('/admin/settings', { settings: { [key]: newVal } });
      showToast(`System setting "${key}" updated to ${newVal}.`, 'success');
    } catch (err) {
      showToast('Failed to update setting', 'danger');
      setSettings(settings); // rollback
    }
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.reg_no && u.reg_no.toLowerCase().includes(userSearch.toLowerCase()));

    const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const pendingUsers = users.filter(u => u.status === 'pending');

  // Filtered Logs
  const filteredLogs = loginLogs.filter(l => {
    const matchesStatus = logFilter === 'all' || l.status === logFilter;
    const matchesSearch =
      (l.email && l.email.toLowerCase().includes(logSearch.toLowerCase())) ||
      (l.ip_address && l.ip_address.includes(logSearch));
    return matchesStatus && matchesSearch;
  });

  return (
    <Layout>
      <div className="container-fluid px-0">
        {/* Toast Alert Notification */}
        {toastMsg.text && (
          <div
            className={`alert alert-${toastMsg.type} alert-dismissible fade show shadow-sm mb-4 d-flex align-items-center gap-2`}
            role="alert"
          >
            <i className={`bi ${toastMsg.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} fs-5`}></i>
            <div>{toastMsg.text}</div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setToastMsg({ text: '', type: '' })}
            ></button>
          </div>
        )}

        {/* Header Hero Banner */}
        <div
          className="rounded-4 p-4 p-md-5 mb-4 text-white shadow-sm position-relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
          }}
        >
          <div className="position-relative z-1 d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4">
            <div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-3 py-1 text-uppercase fw-bold" style={{ fontSize: '0.72rem', letterSpacing: '0.08em' }}>
                  <i className="bi bi-shield-check me-1"></i> Root Administrator
                </span>
                {settings.maintenance_mode === 'true' && (
                  <span className="badge bg-warning text-dark rounded-pill px-3 py-1">
                    <i className="bi bi-cone-striped me-1"></i> Maintenance Active
                  </span>
                )}
                {settings.require_admin_approval === 'true' && (
                  <span className="badge bg-info-subtle text-info rounded-pill px-3 py-1">
                    <i className="bi bi-person-check me-1"></i> Approval Required
                  </span>
                )}
              </div>
              <h1 className="h2 fw-bold mb-1">Campus Command & Control</h1>
              <p className="text-light opacity-75 mb-0 small" style={{ maxWidth: '640px' }}>
                Master administrative dashboard to manage enrolled students, approve account registrations, audit real-time login activity, publish campus announcements, and inspect portal database records.
              </p>
            </div>

            {/* Quick Actions in Header */}
            <div className="d-flex flex-wrap gap-2">
              <button
                className="btn btn-sm btn-outline-light d-flex align-items-center gap-2 rounded-3 px-3 py-2"
                onClick={fetchAllData}
                disabled={loading}
              >
                <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
                <span>Refresh Data</span>
              </button>

              <button
                className="btn btn-sm btn-primary d-flex align-items-center gap-2 rounded-3 px-3 py-2 shadow-sm"
                onClick={openNewAnnounceModal}
              >
                <i className="bi bi-megaphone-fill"></i>
                <span>New Announcement</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="card shadow-xs border-0 rounded-4 mb-4">
          <div className="card-body p-2">
            <ul className="nav nav-pills nav-fill flex-column flex-sm-row gap-1">
              <li className="nav-item">
                <button
                  className={`nav-link text-start text-sm-center rounded-3 fw-semibold py-2 px-3 ${activeTab === 'overview' ? 'active shadow-sm' : 'text-secondary'}`}
                  onClick={() => setActiveTab('overview')}
                >
                  <i className="bi bi-speedometer2 me-2"></i> Overview
                </button>
              </li>
              <li className="nav-item position-relative">
                <button
                  className={`nav-link text-start text-sm-center rounded-3 fw-semibold py-2 px-3 ${activeTab === 'users' ? 'active shadow-sm' : 'text-secondary'}`}
                  onClick={() => setActiveTab('users')}
                >
                  <i className="bi bi-people-fill me-2"></i> Users & Approvals
                  {pendingUsers.length > 0 && (
                    <span className="badge bg-danger rounded-pill ms-2">{pendingUsers.length}</span>
                  )}
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link text-start text-sm-center rounded-3 fw-semibold py-2 px-3 ${activeTab === 'logins' ? 'active shadow-sm' : 'text-secondary'}`}
                  onClick={() => setActiveTab('logins')}
                >
                  <i className="bi bi-clock-history me-2"></i> Login Activity
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link text-start text-sm-center rounded-3 fw-semibold py-2 px-3 ${activeTab === 'announcements' ? 'active shadow-sm' : 'text-secondary'}`}
                  onClick={() => setActiveTab('announcements')}
                >
                  <i className="bi bi-megaphone me-2"></i> Announcements ({announcements.length})
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link text-start text-sm-center rounded-3 fw-semibold py-2 px-3 ${activeTab === 'notifications' ? 'active shadow-sm' : 'text-secondary'}`}
                  onClick={() => setActiveTab('notifications')}
                >
                  <i className="bi bi-send-check me-2"></i> Send Notification
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link text-start text-sm-center rounded-3 fw-semibold py-2 px-3 ${activeTab === 'database' ? 'active shadow-sm' : 'text-secondary'}`}
                  onClick={() => setActiveTab('database')}
                >
                  <i className="bi bi-database me-2"></i> Database Data
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link text-start text-sm-center rounded-3 fw-semibold py-2 px-3 ${activeTab === 'settings' ? 'active shadow-sm' : 'text-secondary'}`}
                  onClick={() => setActiveTab('settings')}
                >
                  <i className="bi bi-sliders me-2"></i> Website Controls
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* TAB 1: OVERVIEW */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div>
            {/* Pending Approvals Urgent Callout Banner */}
            {pendingUsers.length > 0 && (
              <div className="alert alert-warning border-warning shadow-sm rounded-4 p-4 mb-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle bg-warning text-dark p-3 d-flex align-items-center justify-content-center">
                    <i className="bi bi-person-fill-exclamation fs-3"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold text-dark mb-1">
                      {pendingUsers.length} New Student Account{pendingUsers.length > 1 ? 's' : ''} Awaiting Approval
                    </h5>
                    <p className="text-secondary small mb-0">
                      These students cannot access the campus portal or RAG assistant until an administrator reviews and approves their registration.
                    </p>
                  </div>
                </div>
                <button
                  className="btn btn-warning text-dark fw-bold px-4 py-2 rounded-3 shadow-xs"
                  onClick={() => {
                    setUserStatusFilter('pending');
                    setActiveTab('users');
                  }}
                >
                  <i className="bi bi-check2-all me-1"></i> Review & Approve Now
                </button>
              </div>
            )}

            {/* Metric KPI Cards */}
            <div className="row g-3 mb-4">
              <div className="col-sm-6 col-xl-3">
                <div className="card shadow-xs border-0 rounded-4 p-4 h-100 bg-white">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-muted small fw-semibold text-uppercase">Total Registered</span>
                    <span className="p-2 rounded-3 bg-primary-subtle text-primary">
                      <i className="bi bi-people fs-5"></i>
                    </span>
                  </div>
                  <h2 className="fw-bold text-dark mb-1">{stats?.users?.total_users || users.length}</h2>
                  <div className="small text-muted">
                    <span className="text-success fw-semibold">{stats?.users?.approved_users || 0} Approved</span> • {stats?.users?.pending_users || 0} Pending
                  </div>
                </div>
              </div>

              <div className="col-sm-6 col-xl-3">
                <div className="card shadow-xs border-0 rounded-4 p-4 h-100 bg-white">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-muted small fw-semibold text-uppercase">Logins Today</span>
                    <span className="p-2 rounded-3 bg-success-subtle text-success">
                      <i className="bi bi-box-arrow-in-right fs-5"></i>
                    </span>
                  </div>
                  <h2 className="fw-bold text-dark mb-1">{stats?.today_logins?.total_logins || 0}</h2>
                  <div className="small text-muted">
                    <span className="text-success fw-semibold">{stats?.today_logins?.success_logins || 0} Successful</span> • {stats?.today_logins?.failed_logins || 0} Failed
                  </div>
                </div>
              </div>

              <div className="col-sm-6 col-xl-3">
                <div className="card shadow-xs border-0 rounded-4 p-4 h-100 bg-white">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-muted small fw-semibold text-uppercase">Course Documents</span>
                    <span className="p-2 rounded-3 bg-info-subtle text-info">
                      <i className="bi bi-file-earmark-pdf fs-5"></i>
                    </span>
                  </div>
                  <h2 className="fw-bold text-dark mb-1">{stats?.counts?.uploads || 0}</h2>
                  <div className="small text-muted">Stored in MongoDB syllabus repository</div>
                </div>
              </div>

              <div className="col-sm-6 col-xl-3">
                <div className="card shadow-xs border-0 rounded-4 p-4 h-100 bg-white">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-muted small fw-semibold text-uppercase">Diagnostic Quizzes</span>
                    <span className="p-2 rounded-3 bg-warning-subtle text-warning">
                      <i className="bi bi-lightning-charge fs-5"></i>
                    </span>
                  </div>
                  <h2 className="fw-bold text-dark mb-1">{stats?.counts?.assessments || 0}</h2>
                  <div className="small text-muted">Completed exam simulations</div>
                </div>
              </div>
            </div>

            {/* System Status Toggles & Recent Activity Row */}
            <div className="row g-4">
              {/* Left Column: Quick Master Switches */}
              <div className="col-lg-5">
                <div className="card shadow-xs border-0 rounded-4 p-4 h-100 bg-white">
                  <h5 className="fw-bold text-dark mb-3">
                    <i className="bi bi-toggles2 text-primary me-2"></i> Master Website Controls
                  </h5>
                  <p className="text-muted small mb-4">
                    Instantly toggle critical portal policies across all student endpoints.
                  </p>

                  <div className="d-flex flex-column gap-3">
                    {/* Maintenance Mode Toggle */}
                    <div className="p-3 rounded-3 border bg-light d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-semibold text-dark small">Maintenance Mode</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Lock non-admin students out of the portal with an under-maintenance screen.
                        </div>
                      </div>
                      <div className="form-check form-switch ms-3">
                        <input
                          className="form-check-input fs-5"
                          type="checkbox"
                          role="switch"
                          checked={settings.maintenance_mode === 'true'}
                          onChange={() => handleToggleSetting('maintenance_mode')}
                        />
                      </div>
                    </div>

                    {/* Require Admin Approval */}
                    <div className="p-3 rounded-3 border bg-light d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-semibold text-dark small">Require Admin Approval</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          New student registrations are marked 'Pending' until approved by admin.
                        </div>
                      </div>
                      <div className="form-check form-switch ms-3">
                        <input
                          className="form-check-input fs-5"
                          type="checkbox"
                          role="switch"
                          checked={settings.require_admin_approval === 'true'}
                          onChange={() => handleToggleSetting('require_admin_approval')}
                        />
                      </div>
                    </div>

                    {/* Allow Public Signups */}
                    <div className="p-3 rounded-3 border bg-light d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-semibold text-dark small">Allow Public Signups</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Enable or disable new user registration on the /signup page.
                        </div>
                      </div>
                      <div className="form-check form-switch ms-3">
                        <input
                          className="form-check-input fs-5"
                          type="checkbox"
                          role="switch"
                          checked={settings.allow_signups !== 'false'}
                          onChange={() => handleToggleSetting('allow_signups')}
                        />
                      </div>
                    </div>

                    {/* Dashboard Banner */}
                    <div className="p-3 rounded-3 border bg-light d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-semibold text-dark small">Dashboard Announcement Banner</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Display broadcast announcements prominently on student dashboards.
                        </div>
                      </div>
                      <div className="form-check form-switch ms-3">
                        <input
                          className="form-check-input fs-5"
                          type="checkbox"
                          role="switch"
                          checked={settings.announcement_banner_enabled !== 'false'}
                          onChange={() => handleToggleSetting('announcement_banner_enabled')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Recent Login Events Preview */}
              <div className="col-lg-7">
                <div className="card shadow-xs border-0 rounded-4 p-4 h-100 bg-white">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold text-dark mb-0">
                      <i className="bi bi-shield-lock text-primary me-2"></i> Recent Login Events
                    </h5>
                    <button
                      className="btn btn-sm btn-link text-primary text-decoration-none fw-semibold"
                      onClick={() => setActiveTab('logins')}
                    >
                      View All Logs →
                    </button>
                  </div>
                  <p className="text-muted small mb-3">Latest student and administrator authentication attempts.</p>

                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 small">
                      <thead className="table-light">
                        <tr>
                          <th>User</th>
                          <th>Status</th>
                          <th>IP Address</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginLogs.slice(0, 7).map((log) => (
                          <tr key={log.id}>
                            <td className="fw-medium text-dark">{log.email}</td>
                            <td>
                              {log.status === 'success' && (
                                <span className="badge bg-success-subtle text-success">Success</span>
                              )}
                              {log.status === 'failed_password' && (
                                <span className="badge bg-danger-subtle text-danger">Wrong Password</span>
                              )}
                              {log.status === 'pending_approval' && (
                                <span className="badge bg-warning-subtle text-warning-emphasis">Pending Block</span>
                              )}
                              {log.status === 'suspended' && (
                                <span className="badge bg-danger text-white">Suspended</span>
                              )}
                              {log.status === 'maintenance_blocked' && (
                                <span className="badge bg-secondary-subtle text-secondary">Maintenance</span>
                              )}
                            </td>
                            <td className="text-muted font-monospace">{log.ip_address || '127.0.0.1'}</td>
                            <td className="text-muted">{new Date(log.login_time).toLocaleTimeString()}</td>
                          </tr>
                        ))}
                        {loginLogs.length === 0 && (
                          <tr>
                            <td colSpan="4" className="text-center text-muted py-4">
                              No login activity logged yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* TAB 2: USERS & APPROVALS */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'users' && (
          <div className="card shadow-xs border-0 rounded-4 p-4 bg-white">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
              <div>
                <h5 className="fw-bold text-dark mb-1">Enrolled Users & Approval Queue</h5>
                <p className="text-muted small mb-0">
                  Review student registrations, grant administrator privileges, approve pending accounts, or suspend users.
                </p>
              </div>

              {/* Search & Filters */}
              <div className="d-flex flex-wrap gap-2">
                <input
                  type="text"
                  className="form-control form-control-sm rounded-3"
                  placeholder="Search name, email, reg no..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{ width: '220px' }}
                />

                <select
                  className="form-select form-select-sm rounded-3"
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  style={{ width: '140px' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending ({users.filter(u => u.status === 'pending').length})</option>
                  <option value="approved">Approved</option>
                  <option value="suspended">Suspended</option>
                </select>

                <select
                  className="form-select form-select-sm rounded-3"
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  style={{ width: '130px' }}
                >
                  <option value="all">All Roles</option>
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-muted text-uppercase">
                    <th>Student / User</th>
                    <th>Academics</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Last Active</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className={u.status === 'pending' ? 'table-warning' : ''}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <img
                            src={u.profile_photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}
                            alt="Avatar"
                            className="rounded-circle border"
                            style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.src = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
                            }}
                          />
                          <div>
                            <div className="fw-semibold text-dark">{u.name || u.student_name || 'Anonymous'}</div>
                            <div className="text-muted small">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="small">
                        {u.department ? (
                          <div>
                            <span className="fw-medium text-dark">{u.department}</span>
                            <div className="text-muted">{u.year || ''} {u.reg_no ? `• Reg: ${u.reg_no}` : ''}</div>
                          </div>
                        ) : (
                          <span className="text-muted fst-italic">No profile set</span>
                        )}
                      </td>
                      <td>
                        {u.role === 'admin' ? (
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill">
                            <i className="bi bi-shield-fill me-1"></i> Admin
                          </span>
                        ) : (
                          <span className="badge bg-light text-secondary border rounded-pill">
                            Student
                          </span>
                        )}
                      </td>
                      <td>
                        {u.status === 'approved' && (
                          <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill">
                            <i className="bi bi-check-circle-fill me-1"></i> Approved
                          </span>
                        )}
                        {u.status === 'pending' && (
                          <span className="badge bg-warning text-dark rounded-pill fw-bold">
                            <i className="bi bi-hourglass-split me-1"></i> Pending Approval
                          </span>
                        )}
                        {u.status === 'suspended' && (
                          <span className="badge bg-danger text-white rounded-pill">
                            <i className="bi bi-slash-circle me-1"></i> Suspended
                          </span>
                        )}
                        {u.status === 'rejected' && (
                          <span className="badge bg-secondary text-white rounded-pill">
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="small text-muted">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="small text-muted">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {u.status === 'pending' && (
                            <button
                              className="btn btn-success d-flex align-items-center gap-1 shadow-xs"
                              title="Approve User"
                              onClick={() => handleUpdateStatus(u.id, 'approved')}
                              disabled={actionLoading}
                            >
                              <i className="bi bi-check-lg"></i> Approve
                            </button>
                          )}

                          {u.status === 'approved' && (
                            <button
                              className="btn btn-outline-warning"
                              title="Suspend User"
                              onClick={() => handleUpdateStatus(u.id, 'suspended')}
                              disabled={actionLoading || u.email === 'sivagunal15@gmail.com'}
                            >
                              <i className="bi bi-pause-circle"></i> Suspend
                            </button>
                          )}

                          {u.status === 'suspended' && (
                            <button
                              className="btn btn-outline-success"
                              title="Reactivate User"
                              onClick={() => handleUpdateStatus(u.id, 'approved')}
                              disabled={actionLoading}
                            >
                              <i className="bi bi-play-circle"></i> Activate
                            </button>
                          )}

                          {u.role === 'student' ? (
                            <button
                              className="btn btn-outline-primary"
                              title="Promote to Admin"
                              onClick={() => handleUpdateRole(u.id, 'admin')}
                              disabled={actionLoading}
                            >
                              <i className="bi bi-arrow-up-circle"></i> Set Admin
                            </button>
                          ) : (
                            <button
                              className="btn btn-outline-secondary"
                              title="Demote to Student"
                              onClick={() => handleUpdateRole(u.id, 'student')}
                              disabled={actionLoading || u.email === 'sivagunal15@gmail.com'}
                            >
                              <i className="bi bi-arrow-down-circle"></i> Remove Admin
                            </button>
                          )}

                          <button
                            className="btn btn-outline-danger"
                            title="Delete User"
                            onClick={() => handleDeleteUser(u.id, u.name || u.email)}
                            disabled={actionLoading || u.email === 'sivagunal15@gmail.com' || u.email === currentUser?.email}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-5">
                        No users match the specified search or filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* TAB 3: LOGIN ACTIVITY */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'logins' && (
          <div className="card shadow-xs border-0 rounded-4 p-4 bg-white">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
              <div>
                <h5 className="fw-bold text-dark mb-1">Login Audit & Security Log</h5>
                <p className="text-muted small mb-0">
                  Real-time recording of IP addresses, devices, and authentication outcomes to detect unauthorized login attempts.
                </p>
              </div>

              <div className="d-flex flex-wrap gap-2">
                <input
                  type="text"
                  className="form-control form-control-sm rounded-3"
                  placeholder="Filter by email or IP..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  style={{ width: '220px' }}
                />

                <select
                  className="form-select form-select-sm rounded-3"
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  style={{ width: '160px' }}
                >
                  <option value="all">All Outcomes</option>
                  <option value="success">Success</option>
                  <option value="failed_password">Failed Password</option>
                  <option value="pending_approval">Pending Blocked</option>
                  <option value="suspended">Suspended Blocked</option>
                </select>

                <button
                  className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1 rounded-3"
                  onClick={async () => {
                    if (window.confirm('Clear all login history logs?')) {
                      await nodeApi.delete('/admin/login-activity/clear');
                      setLoginLogs([]);
                      showToast('Login logs cleared.', 'info');
                    }
                  }}
                >
                  <i className="bi bi-trash"></i> Clear Logs
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr className="text-uppercase text-muted">
                    <th>Timestamp</th>
                    <th>User Email</th>
                    <th>Outcome</th>
                    <th>IP Address</th>
                    <th>Browser / Device Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="text-muted font-monospace">
                        {new Date(log.login_time).toLocaleString()}
                      </td>
                      <td className="fw-semibold text-dark">{log.email}</td>
                      <td>
                        {log.status === 'success' && (
                          <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill">
                            <i className="bi bi-check-circle-fill me-1"></i> Success
                          </span>
                        )}
                        {log.status === 'failed_password' && (
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill">
                            <i className="bi bi-x-circle-fill me-1"></i> Failed Password
                          </span>
                        )}
                        {log.status === 'pending_approval' && (
                          <span className="badge bg-warning text-dark rounded-pill">
                            <i className="bi bi-shield-exclamation me-1"></i> Pending Approval Block
                          </span>
                        )}
                        {log.status === 'suspended' && (
                          <span className="badge bg-danger text-white rounded-pill">
                            <i className="bi bi-slash-circle me-1"></i> Suspended Account Block
                          </span>
                        )}
                        {log.status === 'maintenance_blocked' && (
                          <span className="badge bg-secondary text-white rounded-pill">
                            Maintenance Block
                          </span>
                        )}
                        {log.status === 'user_not_found' && (
                          <span className="badge bg-dark text-white rounded-pill">
                            Unregistered Email
                          </span>
                        )}
                      </td>
                      <td className="font-monospace text-muted">{log.ip_address || '127.0.0.1'}</td>
                      <td className="text-muted text-truncate" style={{ maxWidth: '300px' }} title={log.user_agent}>
                        {log.user_agent || 'Unknown Client'}
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center text-muted py-5">
                        No login activity matches the specified criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* TAB 4: ANNOUNCEMENTS */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'announcements' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h5 className="fw-bold text-dark mb-1">Campus Announcements & Notices</h5>
                <p className="text-muted small mb-0">
                  Publish campus-wide or department announcements that appear on every student's dashboard and notification feed.
                </p>
              </div>
              <button
                className="btn btn-primary d-flex align-items-center gap-2 rounded-3 shadow-xs"
                onClick={openNewAnnounceModal}
              >
                <i className="bi bi-plus-lg"></i>
                <span>Publish Announcement</span>
              </button>
            </div>

            <div className="row g-3">
              {announcements.map((ann) => (
                <div className="col-lg-6" key={ann.id}>
                  <div className={`card shadow-xs border rounded-4 p-4 h-100 ${ann.is_pinned ? 'border-primary bg-primary-subtle' : 'bg-white'}`}>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-dark text-white rounded-pill px-3 py-1 small">
                          {ann.category || 'General'}
                        </span>
                        {ann.is_pinned && (
                          <span className="badge bg-primary text-white rounded-pill">
                            <i className="bi bi-pin-angle-fill me-1"></i> Pinned
                          </span>
                        )}
                        <span className={`badge rounded-pill ${ann.priority === 'urgent' ? 'bg-danger text-white' : ann.priority === 'high' ? 'bg-warning text-dark' : 'bg-light text-secondary border'}`}>
                          {ann.priority.toUpperCase()}
                        </span>
                        <span className={`badge rounded-pill ${ann.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                          {ann.is_active ? 'Active' : 'Draft / Inactive'}
                        </span>
                      </div>

                      <div className="dropdown">
                        <button
                          className="btn btn-sm btn-light rounded-circle"
                          type="button"
                          data-bs-toggle="dropdown"
                        >
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0">
                          <li>
                            <button
                              className="dropdown-item small"
                              onClick={() => openEditAnnounceModal(ann)}
                            >
                              <i className="bi bi-pencil me-2 text-primary"></i> Edit
                            </button>
                          </li>
                          <li>
                            <button
                              className="dropdown-item small"
                              onClick={() => handleToggleAnnounceActive(ann)}
                            >
                              <i className={`bi ${ann.is_active ? 'bi-eye-slash text-warning' : 'bi-eye text-success'} me-2`}></i>
                              {ann.is_active ? 'Unpublish' : 'Publish Live'}
                            </button>
                          </li>
                          <li><hr className="dropdown-divider" /></li>
                          <li>
                            <button
                              className="dropdown-item small text-danger"
                              onClick={() => handleDeleteAnnouncement(ann.id)}
                            >
                              <i className="bi bi-trash me-2"></i> Delete
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <h5 className="fw-bold text-dark mt-2 mb-2">{ann.title}</h5>
                    <p className="text-secondary small flex-grow-1" style={{ whiteSpace: 'pre-wrap' }}>
                      {ann.content}
                    </p>

                    <div className="d-flex justify-content-between align-items-center pt-3 border-top mt-auto small text-muted">
                      <span>By <strong className="text-dark">{ann.author || 'Campus Admin'}</strong></span>
                      <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="col-12 text-center text-muted py-5 bg-white rounded-4 border">
                  <i className="bi bi-megaphone fs-1 text-secondary opacity-50 mb-2 d-block"></i>
                  <h5>No Announcements Published</h5>
                  <p className="small text-muted">Click "+ Publish Announcement" above to broadcast notifications to all students.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* TAB 5: SEND NOTIFICATION */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'notifications' && (
          <div className="row g-4">
            <div className="col-lg-5">
              <div className="card shadow-xs border-0 rounded-4 p-4 bg-white">
                <h5 className="fw-bold text-dark mb-1">
                  <i className="bi bi-send text-primary me-2"></i> Dispatch Notification
                </h5>
                <p className="text-muted small mb-4">
                  Send a direct alert to a specific student's bell icon, or broadcast across the entire campus.
                </p>

                <form onSubmit={handleSendNotification}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Target Recipient</label>
                    <select
                      className="form-select rounded-3"
                      value={notifForm.recipient_email}
                      onChange={(e) => setNotifForm({ ...notifForm, recipient_email: e.target.value })}
                    >
                      <option value="ALL">📢 All Students (Broadcast)</option>
                      {users.map(u => (
                        <option key={u.id} value={u.email}>
                          👤 {u.name || u.email} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Alert Type</label>
                    <select
                      className="form-select rounded-3"
                      value={notifForm.type}
                      onChange={(e) => setNotifForm({ ...notifForm, type: e.target.value })}
                    >
                      <option value="info">ℹ️ General Info</option>
                      <option value="warning">⚠️ Urgent / Deadline</option>
                      <option value="success">✅ Academic Success</option>
                      <option value="urgent">🚨 Critical System Notice</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Subject / Title</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="e.g., Assignment 3 Submission Deadline Extended"
                      value={notifForm.title}
                      onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-semibold text-secondary">Notification Message</label>
                    <textarea
                      rows="4"
                      className="form-control rounded-3"
                      placeholder="Type details for the student here..."
                      value={notifForm.message}
                      onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })}
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100 rounded-3 py-2 fw-semibold shadow-xs"
                    disabled={actionLoading}
                  >
                    <i className="bi bi-send-fill me-2"></i>
                    {actionLoading ? 'Dispatching...' : 'Send Notification'}
                  </button>
                </form>
              </div>
            </div>

            <div className="col-lg-7">
              <div className="card shadow-xs border-0 rounded-4 p-4 bg-white">
                <h5 className="fw-bold text-dark mb-1">Sent Notifications History</h5>
                <p className="text-muted small mb-3">Recent alerts dispatched to students.</p>

                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 small">
                    <thead className="table-light">
                      <tr className="text-uppercase text-muted">
                        <th>Recipient</th>
                        <th>Type</th>
                        <th>Title & Message</th>
                        <th>Sent</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notifications.map((n) => (
                        <tr key={n.id}>
                          <td className="fw-semibold">
                            {n.recipient_email === 'ALL' ? (
                              <span className="badge bg-primary rounded-pill">All Students</span>
                            ) : (
                              <span className="text-dark">{n.recipient_email}</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge rounded-pill ${n.type === 'warning' ? 'bg-warning-subtle text-warning-emphasis' : n.type === 'urgent' ? 'bg-danger text-white' : 'bg-info-subtle text-info-emphasis'}`}>
                              {n.type}
                            </span>
                          </td>
                          <td style={{ maxWidth: '280px' }}>
                            <div className="fw-bold text-dark">{n.title}</div>
                            <div className="text-muted text-truncate" title={n.message}>{n.message}</div>
                          </td>
                          <td className="text-muted text-nowrap">
                            {new Date(n.created_at).toLocaleDateString()}
                          </td>
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-danger border-0 rounded-2"
                              onClick={() => handleDeleteNotification(n.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {notifications.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center text-muted py-5">
                            No notifications dispatched yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* TAB 6: DATABASE DATA VIEWER */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'database' && (
          <div className="card shadow-xs border-0 rounded-4 p-4 bg-white">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
              <div>
                <h5 className="fw-bold text-dark mb-1">Portal Database Explorer</h5>
                <p className="text-muted small mb-0">
                  Direct raw query inspector across MySQL (users, profiles, logins, settings) and MongoDB (uploads, assessment results, interactions).
                </p>
              </div>
              <button
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 rounded-3"
                onClick={fetchDatabaseExplorer}
              >
                <i className="bi bi-arrow-clockwise"></i> Refresh Records
              </button>
            </div>

            {/* Sub-tabs for tables/collections */}
            <ul className="nav nav-tabs mb-3">
              <li className="nav-item">
                <button
                  className={`nav-link small fw-semibold ${activeDbTab === 'mysql_users' ? 'active text-primary' : 'text-secondary'}`}
                  onClick={() => setActiveDbTab('mysql_users')}
                >
                  <i className="bi bi-table me-1"></i> MySQL: users ({dbData?.mysql?.users?.length || 0})
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link small fw-semibold ${activeDbTab === 'mysql_profiles' ? 'active text-primary' : 'text-secondary'}`}
                  onClick={() => setActiveDbTab('mysql_profiles')}
                >
                  <i className="bi bi-person-lines-fill me-1"></i> MySQL: student_profiles ({dbData?.mysql?.student_profiles?.length || 0})
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link small fw-semibold ${activeDbTab === 'mongo_uploads' ? 'active text-primary' : 'text-secondary'}`}
                  onClick={() => setActiveDbTab('mongo_uploads')}
                >
                  <i className="bi bi-file-earmark-arrow-up me-1"></i> MongoDB: uploads ({dbData?.mongodb?.uploads?.length || 0})
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link small fw-semibold ${activeDbTab === 'mongo_assessments' ? 'active text-primary' : 'text-secondary'}`}
                  onClick={() => setActiveDbTab('mongo_assessments')}
                >
                  <i className="bi bi-journal-check me-1"></i> MongoDB: assessment_results ({dbData?.mongodb?.assessment_results?.length || 0})
                </button>
              </li>
            </ul>

            {/* Raw JSON or Data Table Display */}
            <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {activeDbTab === 'mysql_users' && (
                <table className="table table-sm table-bordered table-striped font-monospace small">
                  <thead className="table-light">
                    <tr>
                      <th>id</th>
                      <th>name</th>
                      <th>email</th>
                      <th>role</th>
                      <th>status</th>
                      <th>created_at</th>
                      <th>last_login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dbData?.mysql?.users || []).map((row) => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.name}</td>
                        <td>{row.email}</td>
                        <td><span className="badge bg-secondary">{row.role}</span></td>
                        <td><span className="badge bg-info text-dark">{row.status}</span></td>
                        <td>{row.created_at}</td>
                        <td>{row.last_login || 'null'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeDbTab === 'mysql_profiles' && (
                <table className="table table-sm table-bordered table-striped font-monospace small">
                  <thead className="table-light">
                    <tr>
                      <th>id</th>
                      <th>email</th>
                      <th>student_name</th>
                      <th>reg_no</th>
                      <th>department</th>
                      <th>year</th>
                      <th>phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dbData?.mysql?.student_profiles || []).map((row) => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.email}</td>
                        <td>{row.student_name}</td>
                        <td>{row.reg_no}</td>
                        <td>{row.department}</td>
                        <td>{row.year}</td>
                        <td>{row.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeDbTab === 'mongo_uploads' && (
                <table className="table table-sm table-bordered table-striped font-monospace small">
                  <thead className="table-light">
                    <tr>
                      <th>_id</th>
                      <th>fileName</th>
                      <th>fileType</th>
                      <th>fileSize</th>
                      <th>email</th>
                      <th>uploadedAt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dbData?.mongodb?.uploads || []).map((row) => (
                      <tr key={row._id}>
                        <td>{row._id}</td>
                        <td className="text-primary fw-bold">{row.fileName}</td>
                        <td>{row.fileType}</td>
                        <td>{row.fileSize ? `${(row.fileSize / 1024).toFixed(1)} KB` : 'N/A'}</td>
                        <td>{row.email}</td>
                        <td>{row.uploadedAt}</td>
                      </tr>
                    ))}
                    {(dbData?.mongodb?.uploads || []).length === 0 && (
                      <tr><td colSpan="6" className="text-center py-4">No uploads found in MongoDB.</td></tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeDbTab === 'mongo_assessments' && (
                <table className="table table-sm table-bordered table-striped font-monospace small">
                  <thead className="table-light">
                    <tr>
                      <th>_id</th>
                      <th>email</th>
                      <th>topic / title</th>
                      <th>score</th>
                      <th>weak_topics</th>
                      <th>timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dbData?.mongodb?.assessment_results || []).map((row) => (
                      <tr key={row._id}>
                        <td>{row._id}</td>
                        <td>{row.email}</td>
                        <td>{row.topic || row.quiz_title || 'ExamSprint'}</td>
                        <td>{row.score !== undefined ? `${row.score}%` : 'N/A'}</td>
                        <td>{Array.isArray(row.weak_topics) ? row.weak_topics.join(', ') : 'None'}</td>
                        <td>{row.timestamp || row.created_at}</td>
                      </tr>
                    ))}
                    {(dbData?.mongodb?.assessment_results || []).length === 0 && (
                      <tr><td colSpan="6" className="text-center py-4">No assessment results recorded in MongoDB.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* TAB 7: WEBSITE CONTROLS */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'settings' && (
          <div className="card shadow-xs border-0 rounded-4 p-4 bg-white" style={{ maxWidth: '800px' }}>
            <h5 className="fw-bold text-dark mb-1">
              <i className="bi bi-shield-shaded text-primary me-2"></i> Campus Portal Master Controls
            </h5>
            <p className="text-muted small mb-4">
              Configure security policies, student onboarding approvals, and site availability.
            </p>

            <div className="d-flex flex-column gap-3 mb-4">
              <div className="p-3 rounded-3 border bg-light d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-bold text-dark">Require Administrator Approval for New Registrations</div>
                  <div className="text-muted small">
                    When active, new students who sign up cannot log in until approved in the "Users & Approvals" tab.
                  </div>
                </div>
                <div className="form-check form-switch ms-3">
                  <input
                    className="form-check-input fs-4"
                    type="checkbox"
                    role="switch"
                    checked={settings.require_admin_approval === 'true'}
                    onChange={() => handleToggleSetting('require_admin_approval')}
                  />
                </div>
              </div>

              <div className="p-3 rounded-3 border bg-light d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-bold text-dark">Allow Public Student Signups</div>
                  <div className="text-muted small">
                    Turn off to close public registrations for end-of-semester or private testing.
                  </div>
                </div>
                <div className="form-check form-switch ms-3">
                  <input
                    className="form-check-input fs-4"
                    type="checkbox"
                    role="switch"
                    checked={settings.allow_signups !== 'false'}
                    onChange={() => handleToggleSetting('allow_signups')}
                  />
                </div>
              </div>

              <div className="p-3 rounded-3 border bg-light d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-bold text-danger">Scheduled Maintenance Mode</div>
                  <div className="text-muted small">
                    Puts the entire campus portal in maintenance mode. Only administrators can authenticate.
                  </div>
                </div>
                <div className="form-check form-switch ms-3">
                  <input
                    className="form-check-input fs-4"
                    type="checkbox"
                    role="switch"
                    checked={settings.maintenance_mode === 'true'}
                    onChange={() => handleToggleSetting('maintenance_mode')}
                  />
                </div>
              </div>

              <div className="p-3 rounded-3 border bg-light d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-bold text-dark">Show Announcement Banner on Student Dashboard</div>
                  <div className="text-muted small">
                    Renders the announcement alert marquee on the main student dashboard.
                  </div>
                </div>
                <div className="form-check form-switch ms-3">
                  <input
                    className="form-check-input fs-4"
                    type="checkbox"
                    role="switch"
                    checked={settings.announcement_banner_enabled !== 'false'}
                    onChange={() => handleToggleSetting('announcement_banner_enabled')}
                  />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-3 bg-primary-subtle border border-primary-subtle small text-primary d-flex align-items-center gap-2">
              <i className="bi bi-info-circle-fill fs-5"></i>
              <div>
                Settings changes take effect immediately across all active Node.js server connections.
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* MODAL: CREATE / EDIT ANNOUNCEMENT */}
        {/* ----------------------------------------------------------- */}
        {showAnnounceModal && (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1200 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content rounded-4 border-0 shadow-lg">
                <div className="modal-header border-bottom py-3">
                  <h5 className="modal-title fw-bold text-dark">
                    <i className="bi bi-megaphone text-primary me-2"></i>
                    {editingAnnounce ? 'Edit Announcement' : 'Publish New Campus Announcement'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowAnnounceModal(false)}
                  ></button>
                </div>
                <form onSubmit={handleSaveAnnouncement}>
                  <div className="modal-body p-4">
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label small fw-semibold text-secondary">Announcement Title</label>
                        <input
                          type="text"
                          className="form-control rounded-3"
                          placeholder="e.g., End Semester Examination Schedule Published"
                          value={announceForm.title}
                          onChange={(e) => setAnnounceForm({ ...announceForm, title: e.target.value })}
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-secondary">Category</label>
                        <select
                          className="form-select rounded-3"
                          value={announceForm.category}
                          onChange={(e) => setAnnounceForm({ ...announceForm, category: e.target.value })}
                        >
                          <option value="General">General Campus</option>
                          <option value="Exam">Exam & Timetable</option>
                          <option value="Lecture">Lecture & Lab Notes</option>
                          <option value="Placement">Placements & Internships</option>
                          <option value="Holiday">Holiday & Recess</option>
                          <option value="Maintenance">System Maintenance</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-secondary">Priority Level</label>
                        <select
                          className="form-select rounded-3"
                          value={announceForm.priority}
                          onChange={(e) => setAnnounceForm({ ...announceForm, priority: e.target.value })}
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                          <option value="urgent">🚨 Urgent Attention</option>
                        </select>
                      </div>

                      <div className="col-12">
                        <label className="form-label small fw-semibold text-secondary">Content & Description</label>
                        <textarea
                          rows="5"
                          className="form-control rounded-3"
                          placeholder="Write the announcement body here..."
                          value={announceForm.content}
                          onChange={(e) => setAnnounceForm({ ...announceForm, content: e.target.value })}
                          required
                        ></textarea>
                      </div>

                      <div className="col-md-6">
                        <div className="form-check form-switch pt-2">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id="pinSwitch"
                            checked={announceForm.is_pinned}
                            onChange={(e) => setAnnounceForm({ ...announceForm, is_pinned: e.target.checked })}
                          />
                          <label className="form-check-label small fw-medium text-dark" htmlFor="pinSwitch">
                            📌 Pin to top of announcements
                          </label>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="form-check form-switch pt-2">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id="activeSwitch"
                            checked={announceForm.is_active}
                            onChange={(e) => setAnnounceForm({ ...announceForm, is_active: e.target.checked })}
                          />
                          <label className="form-check-label small fw-medium text-dark" htmlFor="activeSwitch">
                            📢 Publish live to students immediately
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-top py-3">
                    <button
                      type="button"
                      className="btn btn-light rounded-3 px-4"
                      onClick={() => setShowAnnounceModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary rounded-3 px-4"
                      disabled={actionLoading}
                    >
                      <i className="bi bi-check-lg me-1"></i>
                      {editingAnnounce ? 'Save Changes' : 'Publish Announcement'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default AdminPortal;
