import { Navigate, Link } from 'react-router-dom';
import { authService } from '../services/api';

const AdminRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getUser();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const isAdmin = user && user.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="container py-5 text-center min-vh-100 d-flex flex-column justify-content-center align-items-center">
        <div className="card shadow-sm border-0 p-5 rounded-4" style={{ maxWidth: '480px' }}>
          <div
            className="rounded-circle bg-danger-subtle text-danger mx-auto d-flex align-items-center justify-content-center mb-3"
            style={{ width: '64px', height: '64px' }}
          >
            <i className="bi bi-shield-x fs-1"></i>
          </div>
          <h3 className="fw-bold text-dark mb-2">Access Denied</h3>
          <p className="text-muted small mb-4">
            The Admin Portal is restricted to authorized campus administrators. Your current account (<span className="fw-medium text-dark">{user?.email || 'Student'}</span>) does not have administrator privileges.
          </p>
          <div className="d-flex justify-content-center gap-2">
            <Link to="/dashboard" className="btn btn-primary px-4 rounded-3">
              <i className="bi bi-grid-1x2 me-2"></i> Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
