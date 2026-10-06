import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, User as UserIcon, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="site-navbar">
      <div className="nav-container">
        {/* Brand Logo */}
        <Link to="/" className="nav-brand">
          <div className="brand-mascot-avatar" title="Pashu Drishti AI Cow">
            🐄
          </div>
          <div className="brand-name">
            PASHU DRISHTI<span className="brand-dot">.AI</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="nav-links">
          <Link
            to="/"
            className={`nav-link-item ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link
            to="/detect"
            className={`nav-link-item ${location.pathname === '/detect' ? 'active' : ''}`}
          >
            Detect Disease
          </Link>
          <Link
            to="/diseases"
            className={`nav-link-item ${location.pathname === '/diseases' ? 'active' : ''}`}
          >
            Disease Encyclopedia
          </Link>

          {isAuthenticated && (
            <Link
              to="/dashboard"
              className={`nav-link-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Status Chip & Auth Actions */}
        <div className="nav-actions">
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link
                to="/dashboard"
                className="nav-user-profile-badge"
                title={user?.email}
              >
                <div className="user-avatar-mini">
                  <UserIcon size={14} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.1 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff' }}>{user?.name?.split(' ')[0]}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent-green)', textTransform: 'capitalize' }}>{user?.role}</span>
                </div>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="nav-logout-btn"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link
                to="/login"
                className="nav-link-item"
                style={{ padding: '8px 14px', fontSize: '0.88rem' }}
              >
                Sign In
              </Link>

              <Link to="/signup" className="nav-cta-btn">
                <span>Get Started</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
export default Navbar;
