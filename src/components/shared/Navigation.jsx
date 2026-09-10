import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import './Navigation.css';

const Navigation = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();

  if (location.pathname === '/login') {
    return null;
  }

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/" className="nav-logo">
            Service Portal
          </Link>
        </div>

        <div className="nav-menu">
          <Link to="/" className="nav-link">Dashboard</Link>
          <Link to="/requests" className="nav-link">My Requests</Link>
          <Link to="/new-request" className="nav-link">New Request</Link>
          <Link to="/notifications" className="nav-link">
            Notifications
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </Link>
        </div>

        <div className="nav-user">
          <div className="user-info">
            <span className="user-name">{user?.username}</span>
            <span className={`user-role user-role-${user?.role}`}>{user?.role}</span>
          </div>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
