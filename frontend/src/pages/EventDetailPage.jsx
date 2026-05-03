import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageTransition } from '../components/PageTransition';

export function EventDetailPage() {
  const { event_id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer';
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [ticketQty, setTicketQty] = useState(1);
  const [ticketForm, setTicketForm] = useState({ type: '', quantity_available: 50, price: 0 });
  const [editingTicketId, setEditingTicketId] = useState('');
  const [editTicketForm, setEditTicketForm] = useState({ type: 'Standard', quantity_available: 0, price: 0 });
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function prettyTime(value) {
    if (!value) return 'N/A';
    const s = String(value);
    try {
      // If value is already YYYY-MM-DD, show localized date only
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(s);
        if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
        return s;
      }

      // If ISO or contains time, extract date portion and show localized date
      if (s.includes('T') || /\s\d{1,2}:\d{2}/.test(s)) {
        const datePart = s.split('T')[0].split(' ')[0];
        const d = new Date(datePart);
        if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
        return datePart;
      }

      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return String(value);
      // Fallback: return localized date (no time)
      return d.toLocaleDateString();
    } catch (e) {
      return String(value);
    }
  }
  const hasPaidTickets = tickets.some((ticket) => Number(ticket.price) > 0);
  const isFreeEntryEvent = !hasPaidTickets;
  const canManageEvent = isAdmin || (isOrganizer && event && user?.id === event.organizer_id);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const ev = await api.get_event(event_id);
      setEvent(ev);

      const [ticketData, reviewData] = await Promise.all([
        api.list_event_tickets(event_id),
        api.list_event_reviews(event_id)
      ]);
      setTickets(Array.isArray(ticketData) ? ticketData : []);
      setReviews(Array.isArray(reviewData) ? reviewData : []);
      if (Array.isArray(ticketData) && ticketData.length > 0) {
        const paidTicket = ticketData.find((ticket) => Number(ticket.price) > 0);
        setSelectedTicketId((prev) => prev || paidTicket?.id || ticketData[0].id);
      }

      if (isAuthenticated && (isAdmin || (isOrganizer && ev && user?.id === ev.organizer_id))) {
        const eventOrders = await api.list_event_orders(event_id);
        setOrders(eventOrders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [event_id, isAuthenticated]);

  async function handleRegister() {
    setMessage('');
    setError('');
    try {
      await api.register_for_event(event_id);
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
      await api.create_order(event_id, {
        ticket_id: selectedTicketId,
        quantity: Number(ticketQty),
        payment_method: 'mock-gateway'
      });
      setMessage('Order created! Go to My Tickets to complete payment.');
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
      await api.add_event_review(event_id, {
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
      await api.create_ticket(event_id, {
        type: ticketForm.type,
        quantity_available: Number(ticketForm.quantity_available),
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
      quantity_available: Number(ticket.quantity_available),
      price: Number(ticket.price)
    });
  }

  function cancelEditingTicket() {
    setEditingTicketId('');
    setEditTicketForm({ type: 'Standard', quantity_available: 0, price: 0 });
  }

  async function handleUpdateTicketTier(e) {
    e.preventDefault();
    if (!editingTicketId) {
      return;
    }

    setMessage('');
    setError('');

    try {
      await api.update_ticket(event_id, editingTicketId, {
        type: editTicketForm.type,
        quantity_available: Number(editTicketForm.quantity_available),
        price: Number(editTicketForm.price)
      });
      setMessage('Ticket tier updated.');
      cancelEditingTicket();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteTicketTier(ticket_id) {
    if (!confirm('Delete this ticket tier?')) {
      return;
    }

    setMessage('');
    setError('');

    try {
      await api.delete_ticket(event_id, ticket_id);
      setMessage('Ticket tier deleted.');
      if (editingTicketId === ticket_id) {
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
      await api.delete_event(event_id);
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
    <PageTransition>
      <section className="card detail-card">
        <h1>{event.title}</h1>
      <p className="detail-description">{event.description || 'No description.'}</p>
      {Array.isArray(event.categories) && event.categories.length > 0 && (
        <div className="categories-section" style={{ marginBottom: '1rem' }}>
          <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
            Categories:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {event.categories.map((category) => (
              <span key={category.id} className="result-pill" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>
                {category.name}
              </span>
            ))}
          </div>
        </div>
      )}
      <p className="detail-meta">
        <strong>Start Date:</strong> {prettyTime(event.start_time || event.date)}
      </p>
      <p className="detail-meta">
        <strong>End Date:</strong> {prettyTime(event.end_time)}
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
                <Link className="ghost-btn" to={`/events/${event_id}/edit`}>
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
                        {ticket.type} - {ticket.price} (left: {ticket.quantity_available})
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
                value={ticketForm.quantity_available}
                onChange={(e) =>
                  setTicketForm((prev) => ({ ...prev, quantity_available: e.target.value }))
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
                    Price: {ticket.price} | Remaining: {ticket.quantity_available}
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
                  value={editTicketForm.quantity_available}
                  onChange={(e) =>
                    setEditTicketForm((prev) => ({ ...prev, quantity_available: e.target.value }))
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
                Rating
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${star <= Number(reviewForm.rating) ? 'filled' : ''}`}
                      onClick={() => setReviewForm((prev) => ({ ...prev, rating: star }))}
                    >
                      ★
                    </button>
                  ))}
                  <span style={{ marginLeft: '0.5rem', fontSize: '1.2rem', color: '#9fd3ff' }}>
                    {reviewForm.rating}/5
                  </span>
                </div>
              </label>
              <label>
                Comment
                <textarea
                  rows={3}
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share your experience..."
                />
              </label>
              <button className="solid-btn">✦ Submit Review</button>
            </form>
          ) : (
            <p className="status">Login to submit a review.</p>
          )}
        </div>
      ) : null}

      {canManageEvent ? (
        <div className="card form-card" style={{ marginTop: '2rem' }}>
          <h2>Orders</h2>
          <p className="status">{orders.length} order(s) placed</p>
          {orders.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="pixel-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{order.quantity}</td>
                      <td>${order.total_amount}</td>
                      <td>
                        <span className={`status-badge status-${order.status}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
      </section>
    </PageTransition>
  );
}
