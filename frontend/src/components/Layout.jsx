import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TetrisBackground } from './TetrisBackground';

export function Layout({ children }) {
  const { isAuthenticated, user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer';
  const [menuOpen, setMenuOpen] = useState(false);

  function handleNavClick() {
    setMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <TetrisBackground />
      <div className="scanline-overlay" />
      <header className="topbar">
        <Link to="/" className="brand" onClick={handleNavClick}>
          DCG Event
        </Link>
        <button
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
        <nav className={`nav ${menuOpen ? 'open' : ''}`}>
          <NavLink to="/" onClick={handleNavClick}>Events</NavLink>
          {isAuthenticated ? <NavLink to="/dashboard" onClick={handleNavClick}>Dashboard</NavLink> : null}
          {isAuthenticated ? <NavLink to="/my-tickets" onClick={handleNavClick}>My Tickets</NavLink> : null}
          {isAuthenticated ? <NavLink to="/account" onClick={handleNavClick}>Account</NavLink> : null}
          {isAdmin || isOrganizer ? <NavLink to="/events/new" onClick={handleNavClick}>Create Event</NavLink> : null}
          {isAdmin || isOrganizer ? <NavLink to="/events/stats" onClick={handleNavClick}>Event Stats</NavLink> : null}
          {isAdmin ? <NavLink to="/admin" end onClick={handleNavClick}>Admin Portal</NavLink> : null}
        </nav>
        <div className="auth-area">
          {isAuthenticated ? (
            <>
              <span className="user-pill">{user?.name}</span>
              <button onClick={() => { logout(); handleNavClick(); }} className="ghost-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="ghost-btn" onClick={handleNavClick}>
                Login
              </Link>
              <Link to="/register" className="solid-btn" onClick={handleNavClick}>
                Register
              </Link>
            </>
          )}
        </div>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
