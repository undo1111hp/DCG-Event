import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function MyTicketsPage() {
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [processingOrderId, setProcessingOrderId] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [ordersData, eventsData] = await Promise.all([api.myOrders(), api.listEvents()]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setEvents(Array.isArray(eventsData) ? eventsData : eventsData.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePay(orderId) {
    setMessage('');
    setError('');
    setProcessingOrderId(orderId);
    try {
      await api.payOrder(orderId);
      setMessage('Payment successful!');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingOrderId('');
    }
  }

  async function handleCancel(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setMessage('');
    setError('');
    setProcessingOrderId(orderId);
    try {
      await api.cancelOrder(orderId);
      setMessage('Order cancelled.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingOrderId('');
    }
  }

  const eventMap = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  return (
    <section className="stacked-panel">
      <div className="hero-card card">
        <p className="kicker">My Tickets</p>
        <h1>Order History</h1>
        <p className="status">Track your booking and payment history.</p>
      </div>

      {loading ? <LoadingSpinner /> : null}
      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div className="grid">
        {orders.map((order) => {
          const event = eventMap.get(order.eventId);
          const isPending = order.status === 'pending';
          const isPaid = order.status === 'paid';
          const isCancelled = order.status === 'cancelled';
          const isProcessing = processingOrderId === order.id;

          return (
            <article key={order.id} className="card event-card">
              <h2>{event?.title || 'Event'}</h2>
              <p>
                <strong>Status:</strong>{' '}
                <span className={`status-badge status-${order.status}`}>
                  {order.status.toUpperCase()}
                </span>
              </p>
              <p>
                <strong>Quantity:</strong> {order.quantity}
              </p>
              <p>
                <strong>Total:</strong> {order.totalAmount}
              </p>
              <p>
                <strong>Date:</strong> {order.registrationDate}
              </p>
              <div className="action-row">
                {isPending && (
                  <>
                    <button
                      className="solid-btn"
                      onClick={() => handlePay(order.id)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : 'Pay Now'}
                    </button>
                    <button
                      className="ghost-btn"
                      onClick={() => handleCancel(order.id)}
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {isPaid && event && (
                  <Link className="solid-btn inline" to={`/events/${event.id}`}>
                    View Event
                  </Link>
                )}
                {isCancelled && (
                  <span className="status" style={{ color: 'var(--red)' }}>Order cancelled</span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {!loading && !error && orders.length === 0 ? (
        <p className="status">No ticket orders yet. Buy one from an event detail page.</p>
      ) : null}
    </section>
  );
}
