'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

const EMPTY = { current: '', next: '', confirm: '' };

// Lets a signed-in user change their own password. The current password is checked first,
// so an unlocked device left signed in can't be used to take over the account.
export default function ChangePasswordForm() {
  const { session } = useAuth();
  const [v, setV] = useState(EMPTY);
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState({ saving: false, error: '', done: false });

  const set = (k) => (e) => {
    setV((s) => ({ ...s, [k]: e.target.value }));
    setStatus((s) => ({ ...s, error: '', done: false }));
  };

  async function submit(e) {
    e.preventDefault();
    let error = '';
    if (!v.current) error = 'Enter your current password.';
    else if (v.next.length < 8) error = 'New password must be at least 8 characters.';
    else if (v.next !== v.confirm) error = 'The new passwords do not match.';
    else if (v.next === v.current) error = 'Choose a password different from your current one.';
    if (error) { setStatus({ saving: false, error, done: false }); return; }

    setStatus({ saving: true, error: '', done: false });
    const sb = getSupabase();
    const check = await sb.auth.signInWithPassword({ email: session.user.email, password: v.current });
    if (check.error) {
      setStatus({ saving: false, error: 'Your current password is incorrect.', done: false });
      return;
    }
    const { error: updateError } = await sb.auth.updateUser({ password: v.next });
    if (updateError) {
      setStatus({ saving: false, error: `Could not change password: ${updateError.message}`, done: false });
      return;
    }
    setV(EMPTY);
    setStatus({ saving: false, error: '', done: true });
  }

  const type = show ? 'text' : 'password';

  return (
    <form onSubmit={submit} noValidate>
      {/* Hidden username helps password managers update the right entry. */}
      <input type="text" name="username" autoComplete="username" value={session.user.email} readOnly hidden />
      <div className="stack">
        <div className="field">
          <label htmlFor="pw-current">Current password</label>
          <input id="pw-current" type={type} value={v.current} onChange={set('current')} autoComplete="current-password" />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="pw-next">New password</label>
            <input id="pw-next" type={type} value={v.next} onChange={set('next')} autoComplete="new-password" minLength={8} />
            <p className="field-hint">At least 8 characters.</p>
          </div>
          <div className="field">
            <label htmlFor="pw-confirm">Confirm new password</label>
            <input id="pw-confirm" type={type} value={v.confirm} onChange={set('confirm')} autoComplete="new-password" />
          </div>
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
        </label>
      </div>

      {status.error && <p className="alert alert-error" role="alert">{status.error}</p>}
      {status.done && <p className="alert alert-ok" role="status">Password changed. Use the new password next time you sign in.</p>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={status.saving}>{status.saving ? 'Changing…' : 'Change password'}</button>
      </div>
    </form>
  );
}
