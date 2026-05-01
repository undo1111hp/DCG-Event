import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageTransition } from '../components/PageTransition';

function dateOnly(value) {
  if (value == null || value === '') return '';
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes('T')) return s.split('T')[0];
  if (s.includes(' ')) return s.split(' ')[0];
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

const initialState = {
  title: '',
  description: '',
  date: '',
  start_time: '',
  end_time: '',
  location: ''
};

const emptyVenue = () => ({
  clientId: `venue-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  id: '',
  name: '',
  address: '',
  city: '',
  capacity: ''
});

export function EventFormPage({ mode }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canAddVenueRows = isAdmin || user?.role === 'organizer';
  const [form, setForm] = useState(initialState);
  const [venueForms, setVenueForms] = useState([emptyVenue()]);
  const [existingVenues, setExistingVenues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadForm() {
      try {
        // Load categories and venues
        const [categoryList, venueList] = await Promise.all([
          api.listCategories(),
          api.listVenues()
        ]);

        if (isMounted) {
          setCategories(Array.isArray(categoryList) ? categoryList : []);
          setExistingVenues(Array.isArray(venueList) ? venueList : []);
        }

        if (mode !== 'edit') {
          return;
        }

        const event = await api.getEvent(eventId);
        if (!isMounted) {
          return;
        }

        const mappedVenues = Array.isArray(event.venues) && event.venues.length > 0
          ? event.venues.map((venue) => ({
              clientId: `venue-${venue.id}`,
              source: 'existing',
              selectedVenueId: String(venue.id),
              id: String(venue.id),
              name: venue.name || '',
              address: venue.address || '',
              city: venue.city || '',
              capacity: venue.capacity ?? 100
            }))
          : [emptyVenue()];

        // Get selected category IDs from event
        const catIds = Array.isArray(event.categoryIds)
          ? event.categoryIds.map((id) => String(id))
          : [];

        setForm({
          title: event.title,
          description: event.description,
          date: event.date,
          start_time: dateOnly(event.startTime || event.start_time || event.date || ''),
          end_time: dateOnly(event.endTime || event.end_time || ''),
          location: event.location
        });
        setVenueForms(mappedVenues);
        setSelectedCategoryIds(catIds);
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadForm();

    return () => {
      isMounted = false;
    };
  }, [mode, eventId]);

  function updateVenueForm(clientId, field, value) {
    setVenueForms((current) =>
      current.map((venue) =>
        venue.clientId === clientId
          ? {
              ...venue,
              [field]: value
            }
          : venue
      )
    );
  }

  function handleExistingVenueSelect(clientId, venueId) {
    if (!venueId) {
      updateVenueForm(clientId, 'source', 'custom');
      updateVenueForm(clientId, 'selectedVenueId', '');
      updateVenueForm(clientId, 'id', '');
      return;
    }

    const selectedVenue = existingVenues.find((venue) => String(venue.id) === String(venueId));
    updateVenueForm(clientId, 'source', 'existing');
    updateVenueForm(clientId, 'selectedVenueId', String(venueId));
    updateVenueForm(clientId, 'id', String(venueId));
    updateVenueForm(clientId, 'name', selectedVenue?.name || '');
    updateVenueForm(clientId, 'address', selectedVenue?.address || '');
    updateVenueForm(clientId, 'city', selectedVenue?.city || '');
    updateVenueForm(clientId, 'capacity', selectedVenue?.capacity ?? 100);
  }

  function addVenueForm() {
    setVenueForms((current) => [...current, emptyVenue()]);
  }

  function removeVenueForm(clientId) {
    setVenueForms((current) => {
      if (current.length === 1) {
        return [emptyVenue()];
      }

      return current.filter((venue) => venue.clientId !== clientId);
    });
  }

  function buildVenuePayload(venue) {
    return {
      name: venue.name.trim(),
      address: venue.address.trim(),
      city: venue.city.trim(),
      capacity: Number(venue.capacity)
    };
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = { ...form };
    // Ensure dates are stored as date-only strings (YYYY-MM-DD)
    if (payload.start_time) payload.start_time = dateOnly(payload.start_time);
    if (payload.end_time) payload.end_time = dateOnly(payload.end_time);

    try {
      // Validate at least one category is selected
      if (selectedCategoryIds.length === 0) {
        throw new Error('At least one category must be selected.');
      }

      const normalizedVenues = venueForms
        .map((venue) => ({
          ...venue,
          name: venue.name.trim(),
          address: venue.address.trim(),
          city: venue.city.trim()
        }))
        .filter((venue) =>
          venue.selectedVenueId || venue.name || venue.address || venue.city || String(venue.capacity).trim() !== ''
        );

      const savedVenueIds = [];
      for (const venue of normalizedVenues) {
        if (venue.selectedVenueId) {
          savedVenueIds.push(String(venue.selectedVenueId));
          continue;
        }

        if (!isAdmin) {
          throw new Error('Select an existing venue. Only admins can add new venues.');
        }

        if (!venue.name || !venue.city || venue.capacity === '' || venue.capacity === null || venue.capacity === undefined) {
          throw new Error('Each custom venue must include name, city, and capacity.');
        }

        const venuePayload = buildVenuePayload(venue);
        const savedVenue = venue.id
          ? await api.updateVenue(venue.id, venuePayload)
          : await api.createVenue(venuePayload);

        savedVenueIds.push(savedVenue.id);
      }

      payload.venueIds = savedVenueIds;
      payload.categoryIds = selectedCategoryIds;

      if (mode === 'create') {
        const created = await api.createEvent(payload);
        navigate(`/events/${created.id}`);
      } else {
        const updated = await api.updateEvent(eventId, payload);
        navigate(`/events/${updated.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <PageTransition>
      <section className="card form-card">
        <h1>{mode === 'create' ? 'Create Event' : 'Edit Event'}</h1>
      <form onSubmit={onSubmit} className="form-grid">
        <label>
          Title
          <input
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            required
          />
        </label>
        <label>
          Description
          <textarea
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            rows={4}
          />
        </label>
        <section className="category-panel">
          <h2>Categories</h2>
          <p className="status">Select at least one category for this event.</p>
          {categories.length === 0 ? (
            <p className="status">No categories available. Ask an admin to create some.</p>
          ) : (
            <div className="category-grid">
              {categories.map((category) => {
                const checked = selectedCategoryIds.includes(String(category.id));
                return (
                  <label
                    key={category.id}
                    className={`category-option ${checked ? 'is-selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategoryIds((prev) => [...prev, String(category.id)]);
                        } else {
                          setSelectedCategoryIds((prev) => prev.filter((id) => id !== String(category.id)));
                        }
                      }}
                    />
                    <span>{category.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </section>
        <label>
          Start Date
          <input
            type="date"
            value={form.start_time}
            onChange={(e) => setForm((s) => ({ ...s, start_time: e.target.value }))}
            placeholder="YYYY-MM-DD"
            required
          />
        </label>
        <label>
          End Date
          <input
            type="date"
            value={form.end_time}
            onChange={(e) => setForm((s) => ({ ...s, end_time: e.target.value }))}
            placeholder="YYYY-MM-DD"
            required
          />
        </label>
        <label>
          Location
          <input
            value={form.location}
            onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
            required
          />
        </label>
        <div className="card form-card">
          <div className="toolbar">
            <h2>Venue Details</h2>
            {canAddVenueRows ? (
              <button type="button" className="ghost-btn" onClick={addVenueForm}>
                Add Venue
              </button>
            ) : null}
          </div>
          <p className="status">
            {isAdmin
              ? 'Choose an existing venue or add a custom one for this event.'
              : 'Choose one or more existing venues for this event.'}
          </p>
          <div className="admin-list">
            {venueForms.map((venue, index) => (
              <article key={venue.clientId} className="admin-row" style={{ alignItems: 'flex-start' }}>
                <div className="form-grid" style={{ flex: 1 }}>
                  <div className="result-pill">Venue {index + 1}</div>
                    <div className="venue-source-group">
                      <label className="venue-source-label">Existing Venue</label>
                      <div className="pixel-select-wrap">
                        <select
                          className="pixel-select venue-source-select"
                          value={venue.selectedVenueId || ''}
                          onChange={(e) => handleExistingVenueSelect(venue.clientId, e.target.value)}
                        >
                          <option value="">
                            {isAdmin ? 'Create a new venue' : 'Select a saved venue'}
                          </option>
                          {existingVenues.map((existingVenue) => (
                            <option key={existingVenue.id} value={existingVenue.id}>
                              {existingVenue.name} - {existingVenue.city}
                            </option>
                          ))}
                        </select>
                        <span className="pixel-select-arrow" aria-hidden="true">
                          v
                        </span>
                      </div>
                      <p className="status venue-source-status">
                        {venue.selectedVenueId
                          ? 'This event will use the selected saved venue.'
                          : isAdmin
                            ? 'Fill in the fields below to create a new venue.'
                            : 'Pick a saved venue to continue.'}
                      </p>
                    </div>
                  {isAdmin ? (
                    <>
                      <label>
                        Name
                        <input
                          value={venue.name}
                          onChange={(e) => updateVenueForm(venue.clientId, 'name', e.target.value)}
                          placeholder="Venue name"
                          disabled={Boolean(venue.selectedVenueId)}
                        />
                      </label>
                      <label>
                        Address
                        <input
                          value={venue.address}
                          onChange={(e) => updateVenueForm(venue.clientId, 'address', e.target.value)}
                          placeholder="Street address"
                          disabled={Boolean(venue.selectedVenueId)}
                        />
                      </label>
                      <label>
                        City
                        <input
                          value={venue.city}
                          onChange={(e) => updateVenueForm(venue.clientId, 'city', e.target.value)}
                          placeholder="City"
                          disabled={Boolean(venue.selectedVenueId)}
                        />
                      </label>
                      <label>
                        Capacity
                        <input
                          type="number"
                          min={1}
                          value={venue.capacity}
                          onChange={(e) => updateVenueForm(venue.clientId, 'capacity', e.target.value)}
                          placeholder="100"
                          disabled={Boolean(venue.selectedVenueId)}
                        />
                      </label>
                    </>
                  ) : null}
                </div>
                <button type="button" className="ghost-btn" onClick={() => removeVenueForm(venue.clientId)}>
                  Remove
                </button>
              </article>
            ))}
          </div>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="solid-btn" disabled={saving}>
          {saving ? '⟳ Saving...' : mode === 'create' ? '✦ Create Event' : '💾 Save Changes'}
        </button>
      </form>
      </section>
    </PageTransition>
  );
}
