import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageTransition, StaggerList, StaggerItem } from '../components/PageTransition';

export function EventsPage() {
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState([]);
  const [mlRecommendations, setMlRecommendations] = useState([]);
  const [mlLoading, setMlLoading] = useState(false);
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());
  const [registeredCategoryIds, setRegisteredCategoryIds] = useState(new Set());
  const [registeredVenueIds, setRegisteredVenueIds] = useState(new Set());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  async function loadEvents(currentSearch = search, category_id = selectedCategoryId) {
    setLoading(true);
    setError('');
    try {
      const params = { search: currentSearch };
      if (category_id) {
        params.category_id = category_id;
      }
      const data = await api.list_events(params);
      setEvents(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await api.list_categories();
        setCategories(Array.isArray(cats) ? cats : []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setRegisteredEventIds(new Set());
      setRegisteredCategoryIds(new Set());
      setRegisteredVenueIds(new Set());
      setMlRecommendations([]);
      return;
    }

    let cancelled = false;

    // Fetch ML recommendations
    setMlLoading(true);
    api
      .get_recommended(4)
      .then((recs) => {
        if (cancelled) return;
        setMlRecommendations(Array.isArray(recs) ? recs : []);
      })
      .catch(() => {
        if (!cancelled) setMlRecommendations([]);
      })
      .finally(() => {
        if (!cancelled) setMlLoading(false);
      });

    // Fetch registrations for fallback recommendations
    api
      .my_registrations()
      .then((regs) => {
        if (cancelled) return;
        const eventIds = new Set();
        const catIds = new Set();
        const venIds = new Set();
        for (const reg of regs) {
          eventIds.add(reg.id);
          for (const cid of reg.category_ids || []) catIds.add(cid);
          for (const vid of reg.venue_ids || []) venIds.add(vid);
        }
        setRegisteredEventIds(eventIds);
        setRegisteredCategoryIds(catIds);
        setRegisteredVenueIds(venIds);
      })
      .catch(() => {
        // silently ignore if not authenticated or error
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Fallback: simple overlap-based recommendations for cold-start users
  const fallbackRecommendations = useMemo(() => {
    if (mlRecommendations.length > 0) return [];
    if (registeredCategoryIds.size === 0 && registeredVenueIds.size === 0) return [];
    return events.filter((event) => {
      if (registeredEventIds.has(event.id)) return false;
      const eventCatIds = (event.category_ids || []).map(String);
      const eventVenIds = (event.venue_ids || []).map(String);
      const sharesCategory = eventCatIds.some((id) => registeredCategoryIds.has(id));
      const sharesVenue = eventVenIds.some((id) => registeredVenueIds.has(id));
      return sharesCategory || sharesVenue;
    }).slice(0, 4);
  }, [events, registeredEventIds, registeredCategoryIds, registeredVenueIds, mlRecommendations]);

  const displayRecommendations = mlRecommendations.length > 0 ? mlRecommendations : fallbackRecommendations;
  const isMlPowered = mlRecommendations.length > 0;

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadEvents(search, selectedCategoryId);
    }, 220);
    return () => clearTimeout(timeout);
  }, [search, selectedCategoryId]);

  return (
    <PageTransition>
      <section>
        <div className="section-head">
          <h1>Upcoming Events</h1>
          <button className="ghost-btn" onClick={() => loadEvents(search, selectedCategoryId)}>
            ⟳ Refresh
          </button>
        </div>

        <div className="toolbar">
          <label className="search-field">
            Search Events
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search by title, location, description, date"
            />
          </label>
          <div className="pixel-select-wrap">
            <select
              className="pixel-select"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <span className="pixel-select-arrow" aria-hidden="true">▾</span>
          </div>
          <div className="result-pill">{events.length} shown</div>
        </div>

        {loading ? <LoadingSpinner /> : null}
        {error ? <p className="error">{error}</p> : null}

        {!loading && displayRecommendations.length > 0 && (
          <div className="recommended-section">
            <h2 className="recommended-heading">
              {isMlPowered ? '🤖 Smart Picks' : '✦ Recommended For You'}
            </h2>
            <p className="recommended-subtitle">
              {isMlPowered
                ? 'ML-powered recommendations based on your booking history'
                : 'Based on categories and venues of events you\'ve registered for'}
            </p>
            <StaggerList className="grid">
              {displayRecommendations.map((event) => (
                <StaggerItem key={event.id}>
                  <article className="card event-card recommended-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h2 style={{ margin: 0 }}>{event.title}</h2>
                      {isMlPowered && event.recommendationScore != null && (
                        <span className="match-badge">
                          {event.recommendationScore}% match
                        </span>
                      )}
                    </div>
                    <p>{event.description || 'No description yet.'}</p>
                    {Array.isArray(event.categories) && event.categories.length > 0 && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <p style={{ marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          Categories:
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {event.categories.map((category) => (
                            <span
                              key={category.id}
                              className="result-pill"
                              style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                            >
                              {category.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <p><strong>When:</strong> {event.date}</p>
                    <p><strong>Where:</strong> {event.location}</p>
                    <Link className="solid-btn inline" to={`/events/${event.id}`}>
                      View details ►
                    </Link>
                  </article>
                </StaggerItem>
              ))}
            </StaggerList>
          </div>
        )}

        {!loading && events.length > 0 ? (
          <StaggerList className="grid">
            {events.map((event) => (
              <StaggerItem key={event.id}>
                <article className="card event-card">
                  <h2>{event.title}</h2>
                  <p>{event.description || 'No description yet.'}</p>
                  {Array.isArray(event.categories) && event.categories.length > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <p style={{ marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        Categories:
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {event.categories.map((category) => (
                          <span
                            key={category.id}
                            className="result-pill"
                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                          >
                            {category.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p><strong>When:</strong> {event.date}</p>
                  <p><strong>Where:</strong> {event.location}</p>
                  <Link className="solid-btn inline" to={`/events/${event.id}`}>
                    View details ►
                  </Link>
                </article>
              </StaggerItem>
            ))}
          </StaggerList>
        ) : null}

        {!loading && events.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🔍</span>
            <h3>No Events Found</h3>
            <p>
              {search
                ? `No events match "${search}". Try a different keyword.`
                : 'No events available right now. Check back soon!'}
            </p>
          </div>
        ) : null}
      </section>
    </PageTransition>
  );
}
