import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Families from './pages/Families';
import FamilyDetails from './pages/FamilyDetails';
import MemberDetails from './pages/MemberDetails';
import Community from './pages/Community';
import Reflections from './pages/Reflections';
import Reports from './pages/Reports';
import Resources from './pages/Resources';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LearningObjectives from './pages/LearningObjectives';
import TeacherStudentAssignment from './components/TeacherStudentAssignment';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <p>Loading application...</p>
        <p style={{ fontSize: '0.8rem', color: 'gray', marginTop: '1rem' }}>
          Debug: {user ? 'User loaded' : 'Checking user'} |
          {profile ? 'Profile loaded' : 'Checking profile'}
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user exists but profile is missing despite loading check completing
  if (!profile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ color: '#DC2626', marginBottom: '1rem', fontWeight: 'bold' }}>
          ⚠️ Profile Not Found
        </div>
        <p style={{ marginBottom: '1.5rem', color: '#4B5563' }}>
          We could not load your user profile. This usually means the database connection failed or your account is incomplete.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#0F766E',
            color: 'white',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '0.5rem'
          }}
        >
          Retry
        </button>
        <button
          onClick={() => {
            // Force logout
            localStorage.clear();
            window.location.href = '/login';
          }}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'white',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Logout & Try Again
        </button>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Redirect based on role
    if (profile.role === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
    if (profile.role === 'admin') return <Navigate to="/admin-dashboard" replace />;
    // Only redirect to student dashboard if not already there to prevent loops
    if (location.pathname !== '/') return <Navigate to="/" replace />;
  }

  return children;
};

// Main App Routes Wrapper
const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />

      {/* Student Routes */}
      <Route path="/" element={<ProtectedRoute allowedRoles={['student']}><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="families" element={<Families />} />
        <Route path="families/:id" element={<FamilyDetails />} />
        <Route path="families/:id/members/:memberId" element={<MemberDetails />} />
        <Route path="community" element={<Community />} />
        <Route path="reflections" element={<Reflections />} />
        <Route path="learning-objectives" element={<LearningObjectives />} />
        <Route path="resources" element={<Resources />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Teacher Routes */}
      <Route path="/teacher-dashboard" element={<ProtectedRoute allowedRoles={['teacher']}><Layout /></ProtectedRoute>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Layout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="assignments" element={<TeacherStudentAssignment />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
