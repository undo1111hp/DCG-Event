import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TetrisBackground } from './TetrisBackground';

export function Layout({ children }) {
  const { isAuthenticated, user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer';

  return (
    <div className="app-shell">
      <TetrisBackground />
      <header className="topbar">
        <Link to="/" className="brand">
          DCG Event
        </Link>
        <nav className="nav">
          <NavLink to="/">Events</NavLink>
          {isAuthenticated ? <NavLink to="/dashboard">Dashboard</NavLink> : null}
          {isAuthenticated ? <NavLink to="/my-tickets">My Tickets</NavLink> : null}
          {isAuthenticated ? <NavLink to="/account">Account</NavLink> : null}
          {isAdmin || isOrganizer ? <NavLink to="/events/new">Create Event</NavLink> : null}
          {isAdmin || isOrganizer ? <NavLink to="/events/stats">Event Stats</NavLink> : null}
          {isAdmin ? <NavLink to="/admin" end>Admin Portal</NavLink> : null}
        </nav>
        <div className="auth-area">
          {isAuthenticated ? (
            <>
              <span className="user-pill">{user?.name}</span>
              <button onClick={logout} className="ghost-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="ghost-btn">
                Login
              </Link>
              <Link to="/register" className="solid-btn">
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
