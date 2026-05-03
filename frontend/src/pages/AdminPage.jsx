import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageTransition, StaggerList, StaggerItem } from '../components/PageTransition';

const initialForm = {
  title: '',
  description: '',
  date: '',
  location: ''
};

export function AdminPage() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [venues, setVenues] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [categoryName, setCategoryName] = useState('');
  const [venueForm, setVenueForm] = useState({ name: '', city: '', address: '', capacity: 100 });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [activeTab, setActiveTab] = useState('events');
  const pageSize = 4;

  async function loadEvents() {
    setLoading(true);
    setError('');
    try {
      const data = await api.list_events({ search, page, limit: pageSize });
      const items = Array.isArray(data) ? data : data.items || [];
      setEvents(items);
      setTotalPages(Array.isArray(data) ? 1 : data.total_pages || 1);
      setTotalItems(Array.isArray(data) ? items.length : data.total_items || items.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMeta() {
    try {
      const [categoryData, venueData] = await Promise.all([api.list_categories(), api.list_venues()]);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
      setVenues(Array.isArray(venueData) ? venueData : []);
    } catch {
      // Keep admin page usable even if meta data load fails.
    }
  }

  async function loadUsers() {
    try {
      const userData = await api.list_users();
      setUsers(Array.isArray(userData) ? userData : []);
    } catch {
      // Keep page usable even if user management is unavailable.
    }
  }

  useEffect(() => {
    loadEvents();
    loadMeta();
    loadUsers();
  }, [search, page]);

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setStatus('');

    try {
      await api.create_event(form);
      setForm(initialForm);
      setStatus('Event created.');
      setPage(1);
      await loadEvents();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateCategory(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    try {
      await api.create_category({ name: categoryName });
      setCategoryName('');
      setStatus('Category created.');
      await loadMeta();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateVenue(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    try {
      await api.create_venue({
        ...venueForm,
        capacity: Number(venueForm.capacity)
      });
      setVenueForm({ name: '', city: '', address: '', capacity: 100 });
      setStatus('Venue created.');
      await loadMeta();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleChangeRole(user_id, role) {
    setError('');
    setStatus('');
    try {
      await api.update_user_role(user_id, role);
      setStatus('User role updated.');
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(event_id) {
    if (!confirm('Delete this event?')) {
      return;
    }

    setError('');
    setStatus('');

    try {
      await api.delete_event(event_id);
      setStatus('Event deleted.');
      await loadEvents();
    } catch (err) {
      setError(err.message);
    }
  }

  function goToPage(nextPage) {
    const safePage = Math.min(Math.max(1, nextPage), totalPages);
    setPage(safePage);
  }

  return (
    <PageTransition>
      <section className="admin-wrap">
        <div className="card">
          <h1>Admin Portal</h1>
          <p className="status">Manage all aspects of your events from one control panel.</p>
          <div className="admin-tabs">
            {['events', 'categories', 'venues', 'users'].map((tab) => (
              <button
                key={tab}
                className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'events' && '🎪 '}
                {tab === 'categories' && '🏷️ '}
                {tab === 'venues' && '📍 '}
                {tab === 'users' && '👥 '}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'events' && (
          <>
            <div className="card admin-card">
              <h2>Create Event</h2>
              <div className="toolbar">
                <label className="search-field">
                  Search
                  <input
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="title, location, date..."
                  />
                </label>
                <div className="result-pill">{totalItems} events</div>
              </div>
              <form className="form-grid" onSubmit={handleCreate}>
          <label>
            Title
            <input
              required
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            />
          </label>
          <label>
            Description
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            />
          </label>
          <label>
            Date
            <input
              required
              placeholder="2026-05-30 19:00"
              value={form.date}
              onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
            />
          </label>
          <label>
            Location
            <input
              required
              value={form.location}
              onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
            />
          </label>
          <button className="solid-btn">+ Create Event</button>
              </form>
            </div>

            <div className="card admin-card">
              <h2>Current Events</h2>
              {status ? <p className="success">{status}</p> : null}
              {error ? <p className="error">{error}</p> : null}
              {loading ? <LoadingSpinner /> : null}
              <div className="admin-list">
                {events.map((event) => (
                  <article key={event.id} className="admin-row">
                    <div>
                      <h3>{event.title}</h3>
                      <p>{event.date} | {event.location}</p>
                    </div>
                    <button className="ghost-btn danger" onClick={() => handleDelete(event.id)}>
                      Delete
                    </button>
                  </article>
                ))}
              </div>
              <div className="pagination">
                <button className="ghost-btn" type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
                  ◄ Prev
                </button>
                <span className="result-pill">Page {page} of {totalPages}</span>
                <button className="ghost-btn" type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
                  Next ►
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'categories' && (
          <div className="card admin-card">
            <h2>Categories</h2>
            {status ? <p className="success">{status}</p> : null}
            {error ? <p className="error">{error}</p> : null}
            <form className="form-grid" onSubmit={handleCreateCategory}>
              <label>
                Category Name
                <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="New category name" required />
              </label>
              <button className="solid-btn">+ Create Category</button>
            </form>
            <div className="admin-list" style={{ marginTop: '1rem' }}>
              {categories.length === 0 ? <p className="status">No categories yet.</p> : null}
              {categories.map((category) => (
                <article key={category.id} className="admin-row">
                  <div><h3>{category.name}</h3></div>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'venues' && (
          <div className="card admin-card">
            <h2>Venues</h2>
            {status ? <p className="success">{status}</p> : null}
            {error ? <p className="error">{error}</p> : null}
            <form className="form-grid" onSubmit={handleCreateVenue}>
              <label>
                Name
                <input value={venueForm.name} onChange={(e) => setVenueForm((s) => ({ ...s, name: e.target.value }))} placeholder="Venue name" required />
              </label>
              <label>
                City
                <input value={venueForm.city} onChange={(e) => setVenueForm((s) => ({ ...s, city: e.target.value }))} placeholder="City" required />
              </label>
              <label>
                Address
                <input value={venueForm.address} onChange={(e) => setVenueForm((s) => ({ ...s, address: e.target.value }))} placeholder="Street address" />
              </label>
              <label>
                Capacity
                <input type="number" min={1} value={venueForm.capacity} onChange={(e) => setVenueForm((s) => ({ ...s, capacity: e.target.value }))} required />
              </label>
              <button className="solid-btn">+ Create Venue</button>
            </form>
            <div className="admin-list" style={{ marginTop: '1rem' }}>
              {venues.length === 0 ? <p className="status">No venues yet.</p> : null}
              {venues.map((venue) => (
                <article key={venue.id} className="admin-row">
                  <div>
                    <h3>{venue.name}</h3>
                    <p>{venue.city} | Capacity: {venue.capacity}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="card admin-card">
            <h2>Users</h2>
            <div className="admin-list">
              {users.length === 0 ? <p className="status">No users found.</p> : null}
              {users.map((u) => (
                <article key={u.id} className="admin-row">
                  <div>
                    <h3>{u.name}</h3>
                    <p>{u.email} | <span className="result-pill" style={{ fontSize: '0.9rem' }}>{u.role}</span></p>
                  </div>
                  <div className="action-row">
                    <button className="ghost-btn" onClick={() => handleChangeRole(u.id, 'user')}>User</button>
                    <button className="ghost-btn" onClick={() => handleChangeRole(u.id, 'organizer')}>Organizer</button>
                    <button className="ghost-btn" onClick={() => handleChangeRole(u.id, 'admin')}>Admin</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {status && activeTab === 'events' ? null : null}
        {error && activeTab === 'events' ? null : null}
      </section>
    </PageTransition>
  );
}
