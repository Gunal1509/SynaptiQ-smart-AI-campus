import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { nodeApi, authService } from '../services/api';

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name || !email || !password) {
      setErrorMsg('Please complete all fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await nodeApi.post('/signup', { name, email, password });
      
      // If server specifies approval is required
      if (response.data && response.data.requiresApproval) {
        setSuccessMsg(response.data.message || 'Registration submitted! Your account is pending administrator approval before you can log in.');
        return;
      }

      // If server provides JWT on signup, set session directly
      if (response.data && response.data.token) {
        authService.setSession(
          response.data.token,
          email,
          response.data.user || { name, email }
        );
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        setErrorMsg(error.response.data.message);
      } else {
        setErrorMsg('Unable to register user. Please check your network and credentials.');
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

          <div className="my-auto py-5" style={{ maxWidth: '480px' }}>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-2 mb-3">
              <i className="bi bi-person-plus me-1"></i> Student Onboarding
            </span>
            <h1 className="display-6 fw-bold mb-3 tracking-tight text-white">
              Create your student workspace today.
            </h1>
            <p className="text-secondary fs-6 leading-relaxed mb-4">
              Get immediate access to course materials, real-time timetable tracking, and automated question answering over your syllabus documents.
            </p>

            <div className="card bg-white bg-opacity-10 border border-white border-opacity-10 rounded-4 p-4 text-white">
              <div className="d-flex align-items-center gap-3 mb-2">
                <i className="bi bi-shield-check fs-4 text-primary"></i>
                <h6 className="mb-0 fw-semibold">Secure JWT Campus Authentication</h6>
              </div>
              <p className="small text-secondary mb-0">
                All records, sessions, and uploads are encrypted and protected under campus access tokens.
              </p>
            </div>
          </div>

          <div className="text-secondary small">
            &copy; {new Date().getFullYear()} SynapticQ CampusCopilot. Enterprise Academic Edition.
          </div>
        </div>

        {/* Right Form Column */}
        <div className="col-lg-6 d-flex align-items-center justify-content-center p-4 p-md-5">
          <div className="w-100" style={{ maxWidth: '420px' }}>
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
              <h2 className="fw-bold text-dark mb-1">Create Student Account</h2>
              <p className="text-muted small">Register to start managing courses and academic resources</p>
            </div>

            {errorMsg && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 small mb-4" role="alert">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <div>{errorMsg}</div>
              </div>
            )}

            {successMsg && (
              <div className="alert alert-success rounded-4 p-3 mb-4 shadow-sm" role="alert">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="bi bi-clock-history fs-5 text-success"></i>
                  <strong className="text-dark">Approval Required</strong>
                </div>
                <p className="small mb-3 text-secondary">{successMsg}</p>
                <Link to="/" className="btn btn-sm btn-success rounded-3 w-100 fw-semibold">
                  <i className="bi bi-box-arrow-in-right me-1"></i> Return to Login Screen
                </Link>
              </div>
            )}

            <form onSubmit={handleSignup}>
              <div className="mb-3">
                <label className="form-label text-dark fw-medium small">Full Name</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted">
                    <i className="bi bi-person"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

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

              <div className="mb-3">
                <label className="form-label text-dark fw-medium small">Password</label>
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

              <div className="mb-4">
                <label className="form-label text-dark fw-medium small">Confirm Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted">
                    <i className="bi bi-lock-fill"></i>
                  </span>
                  <input
                    type="password"
                    className="form-control border-start-0 ps-0"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Register Account</span>
                    <i className="bi bi-check2-circle"></i>
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 pt-3 border-top text-center">
              <span className="text-muted small">Already have an account? </span>
              <Link to="/" className="small text-primary fw-semibold text-decoration-none">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;