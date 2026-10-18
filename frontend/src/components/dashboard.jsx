import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import YouTubeRecommendations from './YouTubeRecommendations';
import { nodeApi, authService } from '../services/api';

function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const email = authService.getEmail();

  useEffect(() => {
    // Fetch live announcements
    nodeApi.get('/announcements')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setAnnouncements(res.data);
        }
      })
      .catch(() => {});

    if (email) {
      nodeApi.get(`/profile/${email}`)
        .then((res) => {
          setProfile(res.data);
        })
        .catch((err) => {
          console.error('Failed to load profile on dashboard', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [email]);

  const featureCards = [
    {
      title: 'Upload Syllabus & Notes',
      desc: 'Centralize lecture notes, syllabi, slides, and reference materials in multiple formats.',
      icon: 'bi-cloud-arrow-up',
      badge: 'Repository',
      link: '/uploads',
      color: '#2563eb',
      bgLight: '#eff6ff',
    },
    {
      title: 'RAG Document Assistant',
      desc: 'Ask direct questions from your course PDFs using vector search and grounded LLM answers.',
      icon: 'bi-file-earmark-text',
      badge: 'RAG Powered',
      link: '/rag',
      color: '#0d9488',
      bgLight: '#f0fdfa',
    },
    {
      title: 'AI Campus Copilot',
      desc: 'Instant answers for coursework, programming assignments, and campus general queries.',
      icon: 'bi-chat-dots',
      badge: 'LLM 70B',
      link: '/aiassisstant',
      color: '#6366f1',
      bgLight: '#eef2ff',
    },
    {
      title: 'Class Timetable',
      desc: 'Access section schedules, faculty slots, and download semester timetable sheets.',
      icon: 'bi-calendar3',
      badge: 'Schedule',
      link: '/timetable',
      color: '#d97706',
      bgLight: '#fffbeb',
    },
    {
      title: 'AI Exam Readiness',
      desc: 'Simulate university exams with instant AI scoring and 48-hour weak-spot recovery plans.',
      icon: 'bi-lightning-charge',
      badge: 'Adaptive Diagnostic',
      link: '/examsprint',
      color: '#ea580c',
      bgLight: '#fff7ed',
    },
  ];

  return (
    <Layout>
      <div className="container-fluid p-0">
        {/* Live Campus Announcement Banner */}
        {announcements.length > 0 && (
          <div className="card shadow-xs border-0 rounded-4 p-3 mb-4 bg-white border-start border-4 border-primary shadow-sm">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary text-white rounded-pill px-3 py-1 small">
                  <i className="bi bi-megaphone-fill me-1"></i> Campus Announcement
                </span>
                <span className="badge bg-dark text-white rounded-pill small">
                  {announcements[0].category || 'General'}
                </span>
                {announcements[0].priority === 'urgent' && (
                  <span className="badge bg-danger text-white rounded-pill">Urgent</span>
                )}
                {announcements[0].is_pinned && (
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">
                    <i className="bi bi-pin-angle-fill me-1"></i> Pinned
                  </span>
                )}
                <span className="text-muted small">
                  {new Date(announcements[0].created_at).toLocaleDateString()}
                </span>
              </div>
              <span className="badge bg-light text-secondary border rounded-pill d-none d-sm-inline-block">
                By {announcements[0].author || 'Administrator'}
              </span>
            </div>
            <h6 className="fw-bold text-dark mb-1">{announcements[0].title}</h6>
            <p className="text-secondary small mb-0" style={{ whiteSpace: 'pre-wrap' }}>{announcements[0].content}</p>
          </div>
        )}

        {/* Welcome Hero Card */}
        <div
          className="card border-0 rounded-4 p-4 p-md-5 mb-4 text-white shadow-sm position-relative overflow-hidden"
          style={{
            backgroundColor: '#0f172a',
            backgroundImage: 'radial-gradient(circle at 90% 10%, #1e293b 0%, #0f172a 100%)',
          }}
        >
          <div className="position-relative" style={{ zIndex: 2, maxWidth: '640px' }}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="badge bg-primary px-3 py-1 rounded-pill small">Active Session</span>
              <span className="text-secondary small">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h2 className="display-7 fw-bold mb-2">
              Welcome back, {profile?.student_name || email?.split('@')[0] || 'Student'}! 👋
            </h2>
            <p className="text-secondary mb-4 small leading-relaxed">
              Your academic workspace is synced. Query your course readings with RAG, browse lecture notes, or consult your AI tutor.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <button
                className="btn btn-primary d-flex align-items-center gap-2 px-3 py-2 rounded-3 shadow-sm"
                onClick={() => navigate('/aiassisstant')}
              >
                <i className="bi bi-stars"></i>
                <span>Open AI Copilot</span>
              </button>
              <button
                className="btn btn-outline-light d-flex align-items-center gap-2 px-3 py-2 rounded-3"
                onClick={() => navigate('/uploads')}
              >
                <i className="bi bi-upload"></i>
                <span>Upload Material</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Metric Bar */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border rounded-4 p-3 bg-white shadow-sm">
              <div className="text-muted small fw-medium mb-1">Academic Status</div>
              <div className="h5 fw-bold text-dark mb-0">{profile?.year || '1st Year'}</div>
              <small className="text-success fw-medium">
                <i className="bi bi-check2"></i> Enrolled
              </small>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="card border rounded-4 p-3 bg-white shadow-sm">
              <div className="text-muted small fw-medium mb-1">Department</div>
              <div className="h5 fw-bold text-dark mb-0">{profile?.department || 'CSE'}</div>
              <small className="text-muted">Engineering</small>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="card border rounded-4 p-3 bg-white shadow-sm">
              <div className="text-muted small fw-medium mb-1">RAG Knowledge Base</div>
              <div className="h5 fw-bold text-dark mb-0">Active</div>
              <small className="text-primary fw-medium">FAISS Indexed</small>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="card border rounded-4 p-3 bg-white shadow-sm">
              <div className="text-muted small fw-medium mb-1">Security Session</div>
              <div className="h5 fw-bold text-dark mb-0">JWT Verified</div>
              <small className="text-muted">Expires in 24h</small>
            </div>
          </div>
        </div>

        {/* AI-Powered Personalized Learning Recommendations */}
        <YouTubeRecommendations />

        {/* Feature Modules Grid */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold text-dark mb-0">Campus Services</h5>
            <span className="text-muted small">Select a service to proceed</span>
          </div>

          <div className="row g-4">
            {featureCards.map((card, idx) => (
              <div className="col-12 col-md-6 col-xl-3" key={idx}>
                <div
                  className="card h-100 border rounded-4 p-4 bg-white shadow-sm card-interactive d-flex flex-column justify-content-between"
                  onClick={() => navigate(card.link)}
                >
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div
                        className="rounded-3 d-flex align-items-center justify-content-center"
                        style={{
                          width: '46px',
                          height: '46px',
                          backgroundColor: card.bgLight,
                          color: card.color,
                        }}
                      >
                        <i className={`bi ${card.icon} fs-4`}></i>
                      </div>
                      <span className="badge rounded-pill" style={{ backgroundColor: card.bgLight, color: card.color }}>
                        {card.badge}
                      </span>
                    </div>

                    <h5 className="fw-bold text-dark mb-2">{card.title}</h5>
                    <p className="text-muted small mb-3 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>

                  <div className="pt-2 border-top d-flex align-items-center justify-content-between text-primary small fw-semibold">
                    <span>Access Tool</span>
                    <i className="bi bi-arrow-right"></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements & Academic Activity */}
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card border rounded-4 p-4 bg-white shadow-sm h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold text-dark mb-0">Recent Course Notifications</h6>
                <button
                  className="btn btn-sm btn-link text-decoration-none text-primary"
                  onClick={() => navigate('/timetable')}
                >
                  View Schedule
                </button>
              </div>

              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-start gap-3 p-3 rounded-3 bg-light border">
                  <div className="p-2 bg-primary-subtle text-primary rounded-3">
                    <i className="bi bi-calendar-event fs-5"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-1 text-dark fw-semibold">End Semester Timetable Published</h6>
                      <small className="text-muted">2 days ago</small>
                    </div>
                    <p className="mb-0 text-muted small">
                      The official schedule for all semester examinations is now accessible under the Timetable portal.
                    </p>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3 p-3 rounded-3 bg-light border">
                  <div className="p-2 bg-warning-subtle text-warning-emphasis rounded-3">
                    <i className="bi bi-file-earmark-check fs-5"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-1 text-dark fw-semibold">DBMS Laboratory Assignment Due</h6>
                      <small className="text-muted">Yesterday</small>
                    </div>
                    <p className="mb-0 text-muted small">
                      Module 4 Normalization assignment submission portal closes tomorrow at 11:59 PM.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border rounded-4 p-4 bg-white shadow-sm h-100">
              <h6 className="fw-bold text-dark mb-3">Student Quick Profile</h6>
              <div className="text-center py-2">
                <img
                  src={profile?.profile_photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"}
                  alt="Profile"
                  className="rounded-circle object-fit-cover border mb-2 shadow-xs"
                  style={{ width: '72px', height: '72px' }}
                  onError={(e) => {
                    e.target.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
                  }}
                />
                <h6 className="fw-bold text-dark mb-0">{profile?.student_name || 'Student Name'}</h6>
                <small className="text-muted">{email}</small>
              </div>

              <div className="border-top pt-3 mt-2">
                <div className="d-flex justify-content-between py-1 small">
                  <span className="text-muted">Register No:</span>
                  <span className="fw-semibold text-dark">{profile?.reg_no || 'Not set'}</span>
                </div>
                <div className="d-flex justify-content-between py-1 small">
                  <span className="text-muted">Department:</span>
                  <span className="fw-semibold text-dark">{profile?.department || 'Not set'}</span>
                </div>
                <div className="d-flex justify-content-between py-1 small">
                  <span className="text-muted">Contact:</span>
                  <span className="fw-semibold text-dark">{profile?.phone || 'Not set'}</span>
                </div>
              </div>

              <button
                className="btn btn-outline-primary w-100 mt-3 btn-sm rounded-3"
                onClick={() => navigate('/profiles')}
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;