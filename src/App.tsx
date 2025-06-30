import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SuperAdminDashboard } from './components/super-admin/SuperAdminDashboard';
import { StudentDashboard } from './components/student/StudentDashboard';
import { LandingPage } from './components/LandingPage';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={!user ? <LoginForm /> : <Navigate to="/dashboard" replace />} />
        <Route 
          path="/dashboard" 
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : user.role === 'super_admin' ? (
              <Navigate to="/super-admin" replace />
            ) : user.role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/student" replace />
            )
          } 
        />
        <Route 
          path="/super-admin" 
          element={
            user?.role === 'super_admin' ? (
              <SuperAdminDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/admin" 
          element={
            user?.role === 'admin' || user?.role === 'super_admin' ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/student" 
          element={
            user?.role === 'student' ? (
              <StudentDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;