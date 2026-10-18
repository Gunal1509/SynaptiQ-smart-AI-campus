import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { nodeApi, authService } from '../services/api';

function Login({ setuser }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await nodeApi.post('/login', { email, password });
      if (response.data && response.data.token) {
        authService.setSession(
          response.data.token,
          email,
          response.data.user || { email }
        );

        if (setuser) {
          setuser({ email, ...(response.data.user || {}) });
        }
        navigate('/dashboard');
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        setErrorMsg(error.response.data.message);
      } else {
        setErrorMsg('Unable to connect to authentication server. Please check your network.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid p-0 min-vh-100 d-flex bg-light">
      <div className="row g-0 w-100 flex-grow-1">
        {/* Left Branding Showcase */}
        <div
          className="col-lg-6 d-none d-lg-flex flex-column justify-content-between p-5 text-white position-relative"
          style={{
            backgroundColor: '#0f172a',
            backgroundImage: 'radial-gradient(circle at 20% 20%, #1e293b 0%, #0f172a 100%)',
          }}
        >
          {/* Brand header */}
          <div className="d-flex align-items-center gap-3">
            <div
              className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center shadow-sm"
              style={{ width: '42px', height: '42px', backgroundColor: '#2563eb' }}
            >
              <i className="bi bi-mortarboard-fill fs-5"></i>
            </div>
            <div>
              <h4 className="fw-bold mb-0 tracking-tight">Synaptic<span className="text-primary">Q</span></h4>
              <small className="text-secondary tracking-widest text-uppercase" style={{ fontSize: '0.7rem' }}>Campus Copilot</small>
            </div>
          </div>

          {/* Hero Content */}
          <div className="my-auto py-5" style={{ maxWidth: '480px' }}>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-2 mb-3">
              <i className="bi bi-stars me-1"></i> Academic Workspace 2026
            </span>
            <h1 className="display-6 fw-bold mb-3 tracking-tight text-white">
              The intelligent portal for campus life and academic success.
            </h1>
            <p className="text-secondary fs-6 leading-relaxed mb-4">
              Access lecture syllabus repositories, query your documents using RAG, schedule classes, and tap into instant course assistance with our dedicated AI copilot.
            </p>

            <div className="d-flex flex-column gap-3">
              <div className="d-flex align-items-center gap-3 text-light small">
                <i className="bi bi-check-circle-fill text-primary"></i>
                <span>Secure JWT-authenticated academic access</span>
              </div>
              <div className="d-flex align-items-center gap-3 text-light small">
                <i className="bi bi-check-circle-fill text-primary"></i>
                <span>Retrieval-Augmented Generation (RAG) for lecture notes</span>
              </div>
              <div className="d-flex align-items-center gap-3 text-light small">
                <i className="bi bi-check-circle-fill text-primary"></i>
                <span>Interactive timetable and dynamic course syllabus</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-secondary small">
            &copy; {new Date().getFullYear()} SynapticQ CampusCopilot. Enterprise Academic Edition.
          </div>
        </div>

        {/* Right Form Column */}
        <div className="col-lg-6 d-flex align-items-center justify-content-center p-4 p-md-5">
          <div className="w-100" style={{ maxWidth: '420px' }}>
            {/* Mobile Header */}
            <div className="d-flex align-items-center gap-2 mb-4 d-lg-none">
              <div
                className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center"
                style={{ width: '36px', height: '36px' }}
              >
                <i className="bi bi-mortarboard-fill"></i>
              </div>
              <h5 className="fw-bold mb-0">SynapticQ</h5>
            </div>

            <div className="mb-4">
              <h2 className="fw-bold text-dark mb-1">Sign in to your account</h2>
              <p className="text-muted small">Enter your campus credentials to access your dashboard</p>
            </div>

            {errorMsg && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 small mb-4" role="alert">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <div>{errorMsg}</div>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label text-dark fw-medium small">Campus Email Address</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted">
                    <i className="bi bi-envelope"></i>
                  </span>
                  <input
                    type="email"
                    className="form-control border-start-0 ps-0"
                    placeholder="student@campus.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label text-dark fw-medium small mb-0">Password</label>
                  <a href="#" className="small text-primary text-decoration-none">Forgot?</a>
                </div>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted">
                    <i className="bi bi-lock"></i>
                  </span>
                  <input
                    type="password"
                    className="form-control border-start-0 ps-0"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <i className="bi bi-arrow-right"></i>
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 pt-3 border-top text-center">
              <span className="text-muted small">Don't have an account yet? </span>
              <Link to="/signup" className="small text-primary fw-semibold text-decoration-none">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;