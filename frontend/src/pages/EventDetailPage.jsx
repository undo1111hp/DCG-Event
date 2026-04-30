import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function EventDetailPage() {
  const { eventId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer';
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [ticketQty, setTicketQty] = useState(1);
  const [ticketForm, setTicketForm] = useState({ type: '', quantityAvailable: 50, price: 0 });
  const [editingTicketId, setEditingTicketId] = useState('');
  const [editTicketForm, setEditTicketForm] = useState({ type: 'Standard', quantityAvailable: 0, price: 0 });
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const hasPaidTickets = tickets.some((ticket) => Number(ticket.price) > 0);
  const isFreeEntryEvent = !hasPaidTickets;
  const canManageEvent = isAdmin || (isOrganizer && event && user?.id === event.organizerId);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const ev = await api.getEvent(eventId);
      setEvent(ev);

      const [ticketData, reviewData] = await Promise.all([
        api.listEventTickets(eventId),
        api.listEventReviews(eventId)
      ]);
      setTickets(Array.isArray(ticketData) ? ticketData : []);
      setReviews(Array.isArray(reviewData) ? reviewData : []);
      if (Array.isArray(ticketData) && ticketData.length > 0) {
        const paidTicket = ticketData.find((ticket) => Number(ticket.price) > 0);
        setSelectedTicketId((prev) => prev || paidTicket?.id || ticketData[0].id);
      }

      if (isAuthenticated && (isAdmin || (isOrganizer && ev && user?.id === ev.organizerId))) {
        const regs = await api.listRegistrations(eventId);
        setRegistrations(regs);
      } else {
        setRegistrations([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [eventId, isAuthenticated]);

  async function handleRegister() {
    setMessage('');
    setError('');
    try {
      await api.registerForEvent(eventId);
      setMessage('Registration successful');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleBuyTicket() {
    if (!selectedTicketId) {
      setError('Please select a ticket type');
      return;
    }

    setMessage('');
    setError('');

    try {
      await api.createOrder(eventId, {
        ticketId: selectedTicketId,
        quantity: Number(ticketQty),
        paymentMethod: 'mock-gateway'
      });
      setMessage('Ticket order created and payment recorded. Check My Tickets.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      await api.addEventReview(eventId, {
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment
      });
      setMessage('Review saved.');
      setReviewForm({ rating: 5, comment: '' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateTicketTier(e) {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      await api.createTicket(eventId, {
        type: ticketForm.type,
        quantityAvailable: Number(ticketForm.quantityAvailable),
        price: Number(ticketForm.price)
      });
      setMessage('Ticket tier added.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditingTicket(ticket) {
    setEditingTicketId(ticket.id);
    setEditTicketForm({
      type: ticket.type,
      quantityAvailable: Number(ticket.quantityAvailable),
      price: Number(ticket.price)
    });
  }

  function cancelEditingTicket() {
    setEditingTicketId('');
    setEditTicketForm({ type: 'Standard', quantityAvailable: 0, price: 0 });
  }

  async function handleUpdateTicketTier(e) {
    e.preventDefault();
    if (!editingTicketId) {
      return;
    }

    setMessage('');
    setError('');

    try {
      await api.updateTicket(eventId, editingTicketId, {
        type: editTicketForm.type,
        quantityAvailable: Number(editTicketForm.quantityAvailable),
        price: Number(editTicketForm.price)
      });
      setMessage('Ticket tier updated.');
      cancelEditingTicket();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteTicketTier(ticketId) {
    if (!confirm('Delete this ticket tier?')) {
      return;
    }

    setMessage('');
    setError('');

    try {
      await api.deleteTicket(eventId, ticketId);
      setMessage('Ticket tier deleted.');
      if (editingTicketId === ticketId) {
        cancelEditingTicket();
      }
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this event?')) {
      return;
    }

    try {
      await api.deleteEvent(eventId);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error && !event) {
    return <p className="error">{error}</p>;
  }

  return (
    <section className="card detail-card">
      <h1>{event.title}</h1>
      <p className="detail-description">{event.description || 'No description.'}</p>
      <p className="detail-meta">
        <strong>Start Time:</strong> {event.start_time}
      </p>
      <p className="detail-meta">
        <strong>End Time:</strong> {event.end_time}
      </p>
      <p className="detail-meta">
        <strong>Location:</strong> {event.location}
      </p>
      {Array.isArray(event.venues) && event.venues.length > 0 ? (
        <div className="card form-card">
          <h2>Venue Details</h2>
          <div className="admin-list">
            {event.venues.map((venue) => (
              <article key={venue.id} className="admin-row">
                <div>
                  <h3>{venue.name || 'Venue'}</h3>
                  <p>
                    <strong>Address:</strong> {venue.address || 'N/A'}
                  </p>
                  <p>
                    <strong>City:</strong> {venue.city || 'N/A'}
                  </p>
                  <p>
                    <strong>Capacity:</strong> {venue.capacity ?? 'N/A'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="action-row detail-cta-row">
        {isAuthenticated ? (
          <>
            {isFreeEntryEvent ? (
              <button className="solid-btn" onClick={handleRegister}>
                Join Free Event
              </button>
            ) : null}
            {canManageEvent ? (
              <>
                <Link className="ghost-btn" to={`/events/${eventId}/edit`}>
                  Edit
                </Link>
                <Link className="ghost-btn" to="/events/stats">
                  View Stats
                </Link>
                <button className="ghost-btn" onClick={handleDelete}>
                  Delete
                </button>
              </>
            ) : null}
          </>
        ) : (
          <Link className="solid-btn" to="/login">
            {isFreeEntryEvent ? 'Login to Join Free Event' : 'Login to Buy Ticket'}
          </Link>
        )}
      </div>

      {!canManageEvent ? (
        <div className="card form-card">
          <h2>Buy Ticket</h2>
          {!hasPaidTickets ? (
            <p className="status">This event is free entry. No ticket purchase is required.</p>
          ) : (
            <div className="form-grid">
              <label>
                Ticket Type
                <div className="pixel-select-wrap">
                  <select
                    value={selectedTicketId}
                    onChange={(e) => setSelectedTicketId(e.target.value)}
                    className="pixel-select"
                  >
                    {tickets.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.type} - {ticket.price} (left: {ticket.quantityAvailable})
                      </option>
                    ))}
                  </select>
                  <span className="pixel-select-arrow" aria-hidden="true">
                    v
                  </span>
                </div>
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min={1}
                  value={ticketQty}
                  onChange={(e) => setTicketQty(e.target.value)}
                />
              </label>
              {isAuthenticated ? (
                <button className="solid-btn" onClick={handleBuyTicket}>
                  Buy Ticket
                </button>
              ) : (
                <p className="status">Use the login button above to continue.</p>
              )}
            </div>
          )}
        </div>
      ) : null}

      {canManageEvent ? (
        <div className="card form-card ticket-manage-card">
          <h2>Manage Ticket Tiers</h2>
          <form className="form-grid" onSubmit={handleCreateTicketTier}>
            <label>
              Ticket Tier
              <input
                value={ticketForm.type}
                onChange={(e) => setTicketForm((prev) => ({ ...prev, type: e.target.value }))}
                placeholder="Example: Platinum Access"
                required
              />
            </label>
            <label>
              Amount
              <input
                type="number"
                min={0}
                value={ticketForm.quantityAvailable}
                onChange={(e) =>
                  setTicketForm((prev) => ({ ...prev, quantityAvailable: e.target.value }))
                }
                required
              />
            </label>
            <label>
              Price
              <input
                type="number"
                min={0}
                step="0.01"
                value={ticketForm.price}
                onChange={(e) => setTicketForm((prev) => ({ ...prev, price: e.target.value }))}
                required
              />
            </label>
            <button className="solid-btn">Add Ticket Tier</button>
          </form>

          <div className="admin-list">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="admin-row">
                <div>
                  <h3>{ticket.type}</h3>
                  <p>
                    Price: {ticket.price} | Remaining: {ticket.quantityAvailable}
                  </p>
                </div>
                <div className="action-row">
                  <button className="ghost-btn" type="button" onClick={() => startEditingTicket(ticket)}>
                    Edit
                  </button>
                  <button className="ghost-btn" type="button" onClick={() => handleDeleteTicketTier(ticket.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>

          {editingTicketId ? (
            <form className="form-grid" onSubmit={handleUpdateTicketTier}>
              <h3>Edit Ticket Tier</h3>
              <label>
                Ticket Tier
                <input
                  value={editTicketForm.type}
                  onChange={(e) => setEditTicketForm((prev) => ({ ...prev, type: e.target.value }))}
                  required
                />
              </label>
              <label>
                Amount
                <input
                  type="number"
                  min={0}
                  value={editTicketForm.quantityAvailable}
                  onChange={(e) =>
                    setEditTicketForm((prev) => ({ ...prev, quantityAvailable: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Price
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editTicketForm.price}
                  onChange={(e) => setEditTicketForm((prev) => ({ ...prev, price: e.target.value }))}
                  required
                />
              </label>
              <div className="action-row">
                <button className="solid-btn" type="submit">
                  Save Ticket Tier
                </button>
                <button className="ghost-btn" type="button" onClick={cancelEditingTicket}>
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      {!canManageEvent ? (
        <div className="card form-card">
          <h2>Reviews</h2>
          <div className="timeline">
            {reviews.map((review) => (
              <article key={review.id} className="timeline-row">
                <div className="timeline-dot" />
                <div>
                  <p className="timeline-title">Rating: {review.rating}/5</p>
                  <p>{review.comment || 'No comment'}</p>
                </div>
              </article>
            ))}
            {reviews.length === 0 ? <p className="status">No reviews yet.</p> : null}
          </div>

          {isAuthenticated ? (
            <form className="form-grid" onSubmit={handleSubmitReview}>
              <label>
                Rating (1-5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: e.target.value }))}
                />
              </label>
              <label>
                Comment
                <textarea
                  rows={3}
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                />
              </label>
              <button className="solid-btn">Submit Review</button>
            </form>
          ) : (
            <p className="status">Login to submit a review.</p>
          )}
        </div>
      ) : null}

      {canManageEvent ? (
        <div className="card form-card" style={{ marginTop: '2rem' }}>
          <h2>Registrations</h2>
          <p>{registrations.length} attendee(s)</p>
        </div>
      ) : null}
    </section>
  );
}
