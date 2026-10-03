'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { APP_NAME, isConfigured, toLoginEmail } from '@/lib/config';
import { useAuth } from '@/components/AuthProvider';
import ConfigMissing from '@/components/ConfigMissing';
import InstallButton from '@/components/InstallButton';
import Icon from '@/components/Icon';

function friendlyError(message) {
  if (/invalid login credentials/i.test(message)) return 'Wrong username or password.';
  if (/banned/i.test(message)) return 'This account has been disabled. Contact the admin.';
  if (/fetch|network/i.test(message)) return 'Could not reach the server. Check your internet connection.';
  return message;
}

export default function LoginPage() {
  const { session, profile, isAdmin, notice, setNotice } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session && profile) router.replace(isAdmin ? '/admin' : '/records');
  }, [session, profile, isAdmin, router]);

  useEffect(() => {
    if (notice) { setError(notice); setBusy(false); }
  }, [notice]);

  if (!isConfigured) return <ConfigMissing />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!identifier.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setBusy(true);
    const { error: signInError } = await getSupabase().auth.signInWithPassword({
      email: toLoginEmail(identifier),
      password,
    });
    if (signInError) {
      setError(friendlyError(signInError.message));
      setBusy(false);
    }
    // On success AuthProvider loads the profile and the effect above redirects.
  }

  return (
    <div className="login">
      <aside className="login-side">
        <div className="brand">
          <span className="brand-mark" style={{ background: 'var(--accent-ink)', color: 'var(--accent)' }}><Icon name="truck" size={20} /></span>
          <span>{APP_NAME}</span>
        </div>
        <div>
          <h1>Every truck, every invoice, one log.</h1>
          <p>Record each consignment as it moves — vehicle, FBR digital invoice, both NTNs, goods value and sales tax — and review it by day, week or month.</p>
        </div>
        <ul className="login-fields" aria-label="Recorded for each consignment">
          <li>Truck / vehicle number</li>
          <li>Date and time</li>
          <li>Sender and NTN</li>
          <li>Receiver and NTN</li>
          <li>FBR digital invoice no.</li>
          <li>Goods value and sales tax</li>
        </ul>
      </aside>

      <main className="login-main">
        <form className="login-form" onSubmit={submit} noValidate>
          <h2 className="h2">Sign in</h2>
          <p className="muted">Use the username and password the admin gave you.</p>
          <div className="stack">
            <div className="field">
              <label htmlFor="identifier">Username</label>
              <input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-group">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPassword((s) => !s)} aria-pressed={showPassword}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            {error && <p className="alert alert-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
            <p className="field-hint">Forgot your password? Ask the admin to reset it.</p>
          </div>
          <div className="install-hint">
            <InstallButton />
          </div>
        </form>
      </main>
    </div>
  );
}
