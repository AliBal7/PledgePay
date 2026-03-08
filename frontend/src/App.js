import { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Groups from './pages/Groups';
import Notifications from './pages/Notifications';

function App() {
  const [page, setPage] = useState(localStorage.getItem('token') ? 'dashboard' : 'login');

  return (
    <>
      {page === 'login' && <Login onLogin={() => setPage('dashboard')} />}
      {page === 'dashboard' && (
        <Dashboard
          onLogout={() => { localStorage.removeItem('token'); setPage('login'); }}
          onProfile={() => setPage('profile')}
          onGroups={() => setPage('groups')}
          onNotifications={() => setPage('notifications')}
        />
      )}
      {page === 'profile' && <Profile onBack={() => setPage('dashboard')} />}
      {page === 'groups' && <Groups onBack={() => setPage('dashboard')} />}
      {page === 'notifications' && <Notifications onBack={() => setPage('dashboard')} />}
    </>
  );
}

export default App;