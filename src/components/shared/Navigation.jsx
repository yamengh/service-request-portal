import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname === path;
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/dashboard" className="nav-logo">
            Service Request Portal
          </Link>
        </div>
        <div className="nav-menu">
          <Link 
            to="/dashboard" 
            className={`nav-link ${isActive('/dashboard') ? 'nav-link-active' : ''}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/new-request" 
            className={`nav-link ${isActive('/new-request') ? 'nav-link-active' : ''}`}
          >
            New Request
          </Link>
          <Link 
            to="/requests" 
            className={`nav-link ${isActive('/requests') ? 'nav-link-active' : ''}`}
          >
            My Requests
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
