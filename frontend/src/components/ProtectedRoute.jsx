import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/api';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  if (!authService.isAuthenticated()) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
