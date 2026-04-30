import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

const initialState = {
  title: '',
  description: '',
  date: '',
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
  const [form, setForm] = useState(initialState);
  const [venueForms, setVenueForms] = useState([emptyVenue()]);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'edit') {
      return;
    }

    api
      .getEvent(eventId)
      .then((event) => {
        const mappedVenues = Array.isArray(event.venues) && event.venues.length > 0
          ? event.venues.map((venue) => ({
              clientId: `venue-${venue.id}`,
              id: venue.id,
              name: venue.name || '',
              address: venue.address || '',
              city: venue.city || '',
              capacity: venue.capacity ?? 100
            }))
          : [emptyVenue()];

        setForm({
          title: event.title,
          description: event.description,
          date: event.date,
          location: event.location
        });
        setVenueForms(mappedVenues);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
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

    try {
      const normalizedVenues = venueForms
        .map((venue) => ({ ...venue, name: venue.name.trim(), address: venue.address.trim(), city: venue.city.trim() }))
        .filter((venue) => venue.name || venue.address || venue.city || String(venue.capacity).trim() !== '');

      const savedVenueIds = [];
      for (const venue of normalizedVenues) {
        if (!venue.name || !venue.city || venue.capacity === '' || venue.capacity === null || venue.capacity === undefined) {
          throw new Error('Each venue must include name, city, and capacity.');
        }

        const venuePayload = buildVenuePayload(venue);
        const savedVenue = venue.id
          ? await api.updateVenue(venue.id, venuePayload)
          : await api.createVenue(venuePayload);

        savedVenueIds.push(savedVenue.id);
      }

      payload.venueIds = savedVenueIds;

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
        <label>
          Start Time
          <input
            value={form.start_time}
            onChange={(e) => setForm((s) => ({ ...s, start_time: e.target.value }))}
            placeholder="2026-05-01 18:30"
            required
          />
        </label>
        <label>
          End Time
          <input
            value={form.end_time}
            onChange={(e) => setForm((s) => ({ ...s, end_time: e.target.value }))}
            placeholder="2026-05-02 18:30"
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
            <button type="button" className="ghost-btn" onClick={addVenueForm}>
              Add Venue
            </button>
          </div>
          <p className="status">Add or edit venue name, address, city, and capacity for this event.</p>
          <div className="admin-list">
            {venueForms.map((venue, index) => (
              <article key={venue.clientId} className="admin-row" style={{ alignItems: 'flex-start' }}>
                <div className="form-grid" style={{ flex: 1 }}>
                  <div className="result-pill">Venue {index + 1}</div>
                  <label>
                    Name
                    <input
                      value={venue.name}
                      onChange={(e) => updateVenueForm(venue.clientId, 'name', e.target.value)}
                      placeholder="Venue name"
                    />
                  </label>
                  <label>
                    Address
                    <input
                      value={venue.address}
                      onChange={(e) => updateVenueForm(venue.clientId, 'address', e.target.value)}
                      placeholder="Street address"
                    />
                  </label>
                  <label>
                    City
                    <input
                      value={venue.city}
                      onChange={(e) => updateVenueForm(venue.clientId, 'city', e.target.value)}
                      placeholder="City"
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
                    />
                  </label>
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
          {saving ? 'Saving...' : mode === 'create' ? 'Create Event' : 'Save Changes'}
        </button>
      </form>
    </section>
  );
}
