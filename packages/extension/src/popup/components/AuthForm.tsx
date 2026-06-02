import { useState } from 'react';
import { useAuthStore } from '../../store';
import { login, signup } from '../../lib/api';
import { NormalizedApiError } from '../../lib/api-client';

type Mode = 'login' | 'signup';

export function AuthForm() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = mode === 'login' ? await login(email, password) : await signup(email, password);
      setAuth(result.token, result.user);
    } catch (err) {
      if (err instanceof NormalizedApiError) {
        setError(err.message);
      } else {
        setError('Unexpected error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
      {error && <div className="error">{error}</div>}
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
      </button>
      <button
        type="button"
        className="secondary"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
      >
        {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
      </button>
    </form>
  );
}
