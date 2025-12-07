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
import TeacherDashboard from './pages/TeacherDashboard';
import LearningObjectives from './pages/LearningObjectives';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Build a robust redirect based on role
    if (user.role === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

// Main App Routes Wrapper
const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />

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
        <Route path="settings" element={<Settings />} /> {/* Reusing settings for logout */}
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
