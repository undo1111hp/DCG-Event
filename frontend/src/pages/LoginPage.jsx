import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageTransition } from '../components/PageTransition';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const account = await login(form.email, form.password);
      navigate(location.state?.from || (account?.role === 'admin' ? '/admin' : '/dashboard'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageTransition>
      <section className="card auth-card">
        <h1>Login</h1>
        <form onSubmit={onSubmit} className="form-grid">
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              placeholder="your@email.com"
              required
              autoFocus
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              placeholder="••••••••"
              required
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="solid-btn" disabled={loading}>
            {loading ? '⟳ Signing in...' : '► Login'}
          </button>
        </form>
        <div className="auth-divider">or</div>
        <p>
          No account? <Link to="/register">Create one ►</Link>
        </p>
      </section>
    </PageTransition>
  );
}
