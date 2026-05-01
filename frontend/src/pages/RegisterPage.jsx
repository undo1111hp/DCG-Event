import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageTransition } from '../components/PageTransition';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageTransition>
      <section className="card auth-card">
        <h1>Create Account</h1>
        <form onSubmit={onSubmit} className="form-grid">
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Your name"
              required
              autoFocus
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              placeholder="your@email.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              placeholder="Min 6 characters"
              required
              minLength={6}
            />
          </label>
          <p className="status">New signups are attendee accounts by default.</p>
          {error ? <p className="error">{error}</p> : null}
          <button className="solid-btn" disabled={loading}>
            {loading ? '⟳ Creating...' : '✦ Register'}
          </button>
        </form>
        <div className="auth-divider">or</div>
        <p>
          Already have an account? <Link to="/login">Login ►</Link>
        </p>
      </section>
    </PageTransition>
  );
}
