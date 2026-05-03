import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageTransition, StaggerList, StaggerItem } from '../components/PageTransition';

export function EventsPage() {
  const [events, setEvents] = useState([]);
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
