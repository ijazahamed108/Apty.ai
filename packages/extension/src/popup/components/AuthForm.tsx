import { useState } from 'react';
import { useAuthStore } from '../../store';
import { forgotPassword, login, signup } from '../../lib/api';
import { NormalizedApiError } from '../../lib/api-client';

type Mode = 'login' | 'signup' | 'forgot';

export function AuthForm() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const result = await forgotPassword(email);
        setSuccess(result.message);
        setPassword('');
        return;
      }

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
      <h2>
        {mode === 'login'
          ? 'Sign in'
          : mode === 'signup'
            ? 'Create account'
            : 'Reset password'}
      </h2>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      {mode !== 'forgot' && (
        <label>
          Password
          <span className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              className="icon-button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((value) => !value)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5c5.2 0 8.5 4.4 9.5 6.3.2.4.2.9 0 1.3C20.5 14.6 17.2 19 12 19s-8.5-4.4-9.5-6.3a1.4 1.4 0 0 1 0-1.3C3.5 9.4 6.8 5 12 5Zm0 2c-4 0-6.7 3.3-7.5 5 .8 1.7 3.5 5 7.5 5s6.7-3.3 7.5-5C18.7 10.3 16 7 12 7Zm0 2.5A2.5 2.5 0 1 1 12 14a2.5 2.5 0 0 1 0-5Z" />
              </svg>
            </button>
          </span>
        </label>
      )}
      <button type="submit" disabled={loading}>
        {loading
          ? 'Please wait…'
          : mode === 'login'
            ? 'Sign in'
            : mode === 'signup'
              ? 'Sign up'
              : 'Send reset link'}
      </button>
      <button
        type="button"
        className="secondary"
        onClick={() => {
          setMode(mode === 'login' ? 'signup' : 'login');
          setError(null);
          setSuccess(null);
        }}
      >
        {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
      </button>
      {mode === 'login' && (
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setMode('forgot');
            setError(null);
            setSuccess(null);
            setPassword('');
          }}
        >
          Forgot password?
        </button>
      )}
    </form>
  );
}
