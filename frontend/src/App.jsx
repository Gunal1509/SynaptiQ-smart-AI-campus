import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/login';
import Signup from './components/signup';
import Dashboard from './components/dashboard';
import Uploads from './components/Uploads';
import Profiles from './components/Profiles';
import TimeTable from './components/TimeTable';
import Rag from './components/Rag';
import AIAssisstant from './components/AIAssisstant';
import ExamSprint from './components/ExamSprint';
import AdminPortal from './components/AdminPortal';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  const [user, setUser] = useState(null);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Login setuser={setUser} />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected Routes (Requires JWT Authentication) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/uploads"
        element={
          <ProtectedRoute>
            <Uploads />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profiles"
        element={
          <ProtectedRoute>
            <Profiles user={user} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timetable"
        element={
          <ProtectedRoute>
            <TimeTable />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rag"
        element={
          <ProtectedRoute>
            <Rag />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aiassisstant"
        element={
          <ProtectedRoute>
            <AIAssisstant />
          </ProtectedRoute>
        }
      />
      <Route
        path="/examsprint"
        element={
          <ProtectedRoute>
            <ExamSprint />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPortal />
          </AdminRoute>
        }
      />

      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;