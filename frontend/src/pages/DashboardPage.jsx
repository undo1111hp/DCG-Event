import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

function getBadges(events) {
  const count = events.length;
  const uniqueLocations = new Set(events.map((event) => event.location)).size;

  return [
    {
      id: 'rookie',
      name: 'Rookie RSVP',
      description: 'Register for your first event.',
      unlocked: count >= 1
    },
    {
      id: 'collector',
      name: 'Line Collector',
      description: 'Register for at least 3 events.',
      unlocked: count >= 3
    },
    {
      id: 'traveler',
      name: 'Map Hopper',
      description: 'Register in 2 different locations.',
      unlocked: uniqueLocations >= 2
    }
  ];
}

export function DashboardPage() {
  const { user } = useAuth();
  const isOrganizer = user?.role === 'organizer';
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const data = await api.myRegistrations();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const totalRegistered = events.length;
  const target = 5;
  const progressPercent = Math.min(100, Math.round((totalRegistered / target) * 100));
  const score = totalRegistered * 120;
  const badges = getBadges(events);
  const recentActivity = [...events].sort(
    (a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
  );

  return (
    <section className="stacked-panel">
      <div className="hero-card card">
        <p className="kicker">Player Dashboard</p>
        <h1>Welcome, {user?.name}</h1>
        <p className="status">Track your event journey with score, badges, and recent activity.</p>
      </div>

      <div className="grid dashboard-summary-grid">
        <article className="card summary-tile">
          <p className="kicker">Score</p>
          <h2>{score} XP</h2>
          <p className="status">+120 XP per registered event</p>
        </article>
        <article className="card summary-tile">
          <p className="kicker">Progress</p>
          <h2>
            {totalRegistered}/{target} Events
          </h2>
          <div className="meter-track" aria-label="registration progress">
            <div className="meter-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="status">Completion: {progressPercent}%</p>
        </article>
      </div>

      <div className="card">
        <h2>Badge Unlocks</h2>
        <div className="badge-grid">
          {badges.map((badge) => (
            <article key={badge.id} className={`badge-chip ${badge.unlocked ? 'badge-on' : 'badge-off'}`}>
              <h3>{badge.name}</h3>
              <p>{badge.description}</p>
              <p className="status">{badge.unlocked ? 'Unlocked' : 'Locked'}</p>
            </article>
          ))}
        </div>
      </div>

      {isOrganizer ? (
        <div className="card">
          <h2>Organizer Tools</h2>
          <p className="status">Create and manage your own events without admin access.</p>
          <div className="action-row">
            <Link className="solid-btn" to="/events/new">
              Create Event
            </Link>
            <Link className="ghost-btn" to="/events/stats">
              Event Stats
            </Link>
          </div>
        </div>
      ) : null}

      {loading ? <LoadingSpinner /> : null}
      {error ? <p className="error">{error}</p> : null}

      <div className="card">
        <h2>Recent Activity</h2>
        <div className="timeline">
          {recentActivity.map((event) => (
            <article key={`activity-${event.registrationId}`} className="timeline-row">
              <div className="timeline-dot" />
              <div>
                <p className="timeline-title">Registered for {event.title}</p>
                <p className="status">{new Date(event.registeredAt).toLocaleString()}</p>
              </div>
            </article>
          ))}
          {!loading && recentActivity.length === 0 ? (
            <p className="status">No activity yet. Register for an event to begin.</p>
          ) : null}
        </div>
      </div>

      <div className="grid">
        {events.map((event) => (
          <article key={event.registrationId} className="card event-card">
            <h2>{event.title}</h2>
            <p>{event.description || 'No description yet.'}</p>
            <p>
              <strong>When:</strong> {event.date}
            </p>
            <p>
              <strong>Where:</strong> {event.location}
            </p>
            <p>
              <strong>Registered:</strong> {new Date(event.registeredAt).toLocaleString()}
            </p>
            <Link className="solid-btn inline" to={`/events/${event.id}`}>
              View event
            </Link>
          </article>
        ))}
      </div>
      {!loading && events.length === 0 ? (
        <p className="status">You have not registered for any events yet.</p>
      ) : null}
    </section>
  );
}
