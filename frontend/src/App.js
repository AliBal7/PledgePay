import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Groups from './pages/Groups';
import Notifications from './pages/Notifications';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  };

  return (
    <Routes>
      <Route path="/login" element={
        localStorage.getItem('token') ? <Navigate to="/" replace /> : <Login onLogin={() => navigate('/', { replace: true })} />
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard
            onLogout={handleLogout}
            onProfile={() => navigate('/profile')}
            onGroups={() => navigate('/groups')}
            onNotifications={() => navigate('/notifications')}
          />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute><Profile onBack={() => navigate('/')} /></ProtectedRoute>
      } />
      <Route path="/groups" element={
        <ProtectedRoute><Groups onBack={() => navigate('/')} /></ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute><Notifications onBack={() => navigate('/')} /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;