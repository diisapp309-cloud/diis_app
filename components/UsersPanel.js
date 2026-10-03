'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/supabase';
import { formatDateTime, generatePassword } from '@/lib/format';
import { USERNAME_PATTERN } from '@/lib/config';
import { cleanDetails } from '@/lib/profile';
import ProfileDetailsForm from './ProfileDetailsForm';
import { useAuth } from './AuthProvider';
import Icon from './Icon';
import Modal from './Modal';

function PasswordInput({ id, value, onChange }) {
  const [visible, setVisible] = useState(true);
  return (
    <div className="input-group">
      <input id={id} type={visible ? 'text' : 'password'} className="mono" value={value} onChange={(e) => onChange(e.target.value)} autoComplete="new-password" minLength={8} required />
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVisible((v) => !v)}>{visible ? 'Hide' : 'Show'}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(generatePassword())}>Generate</button>
    </div>
  );
}

function Credentials({ username, password, onDone }) {
  const [copied, setCopied] = useState(false);
  const text = `Username: ${username}\nPassword: ${password}`;
  return (
    <div className="credentials">
      <p>Share these sign-in details with the user. The password is not shown again.</p>
      <pre className="mono">{text}</pre>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true))}>
          <Icon name="copy" size={16} /> {copied ? 'Copied' : 'Copy'}
        </button>
        <button type="button" className="btn btn-primary" onClick={onDone}>Done</button>
      </div>
    </div>
  );
}

function CreateUserForm({ onCreated, onCancel }) {
  const [v, setV] = useState({ username: '', full_name: '', phone: '', cnic: '', password: generatePassword(), role: 'user' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  const set = (k) => (e) => setV((s) => ({ ...s, [k]: typeof e === 'string' ? e : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    const username = v.username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(username)) return setError('Username must be 3–32 characters: lowercase letters, numbers, dot, dash or underscore.');
    if (v.password.length < 8) return setError('Password must be at least 8 characters.');
    const { values: details, errors } = cleanDetails({ full_name: v.full_name, phone: v.phone, cnic: v.cnic });
    if (Object.keys(errors).length) return setError(Object.values(errors)[0]);
    setSaving(true);
    try {
      await adminApi('/api/admin/users', { method: 'POST', body: { ...v, ...details, username } });
      setCreated({ username, password: v.password });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (created) return <Credentials {...created} onDone={onCancel} />;

  return (
    <form onSubmit={submit} noValidate className="stack">
      <div className="field">
        <label htmlFor="u-username">Username</label>
        <input id="u-username" className="mono" value={v.username} onChange={set('username')} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={32} required />
        <p className="field-hint">Used to sign in. Lowercase letters, numbers, dot, dash, underscore.</p>
      </div>
      <div className="field">
        <label htmlFor="u-name">Full name <span className="muted">(optional)</span></label>
        <input id="u-name" value={v.full_name} onChange={set('full_name')} maxLength={120} />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="u-phone">Phone <span className="muted">(optional)</span></label>
          <input id="u-phone" value={v.phone} onChange={set('phone')} inputMode="tel" maxLength={20} placeholder="+92 300 1234567" />
        </div>
        <div className="field">
          <label htmlFor="u-cnic">CNIC <span className="muted">(optional)</span></label>
          <input id="u-cnic" className="mono" value={v.cnic} onChange={set('cnic')} inputMode="numeric" maxLength={15} placeholder="12345-1234567-1" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="u-password">Password</label>
        <PasswordInput id="u-password" value={v.password} onChange={set('password')} />
        <p className="field-hint">At least 8 characters.</p>
      </div>
      <div className="field">
        <label htmlFor="u-role">Role</label>
        <select id="u-role" value={v.role} onChange={set('role')}>
          <option value="user">User — submits and sees own records</option>
          <option value="admin">Admin — full access</option>
        </select>
      </div>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create account'}</button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ user, onCancel }) {
  const [password, setPassword] = useState(generatePassword());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setSaving(true);
    setError('');
    try {
      await adminApi(`/api/admin/users/${user.id}`, { method: 'PATCH', body: { password } });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (done) return <Credentials username={user.username} password={password} onDone={onCancel} />;

  return (
    <form onSubmit={submit} noValidate className="stack">
      <p className="muted">Set a new password for <strong>{user.username}</strong>. Their old password stops working immediately.</p>
      <div className="field">
        <label htmlFor="r-password">New password</label>
        <PasswordInput id="r-password" value={password} onChange={setPassword} />
      </div>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Reset password'}</button>
      </div>
    </form>
  );
}

export default function UsersPanel() {
  const { profile } = useAuth();
  const [state, setState] = useState({ status: 'loading', users: [], error: '' });
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(null);
  const [rowError, setRowError] = useState('');

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: s.users.length ? 'ready' : 'loading', error: '' }));
    try {
      const { users } = await adminApi('/api/admin/users');
      setState({ status: 'ready', users, error: '' });
    } catch (err) {
      setState({ status: 'error', users: [], error: err.message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const closeDialog = useCallback(() => setDialog(null), []);

  async function patch(user, body, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(user.id);
    setRowError('');
    try {
      await adminApi(`/api/admin/users/${user.id}`, { method: 'PATCH', body });
      await load();
    } catch (err) {
      setRowError(`${user.username}: ${err.message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="users-title">
      <div className="records-head">
        <div>
          <h1 id="users-title" className="h1">Users</h1>
          <p className="muted">Only you can create accounts. Users sign in with the username and password you give them.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDialog({ type: 'create' })}>
          <Icon name="plus" /> New user
        </button>
      </div>

      {rowError && <p className="alert alert-error" role="alert">{rowError}</p>}

      {state.status === 'loading' && <div className="state" role="status"><span className="spinner" /> <p>Loading users…</p></div>}
      {state.status === 'error' && (
        <div className="state state-error" role="alert">
          <p><strong>Could not load users.</strong> {state.error}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={load}><Icon name="refresh" size={16} /> Try again</button>
        </div>
      )}
      {state.status === 'ready' && state.users.length <= 1 && (
        <p className="alert">No user accounts yet. Create one so your team can start submitting records.</p>
      )}

      {state.status === 'ready' && state.users.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Last sign-in</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {state.users.map((u) => {
                const self = u.id === profile.id;
                return (
                  <tr key={u.id} className={u.is_active ? '' : 'is-muted'}>
                    <td>
                      <span className="mono">{u.username}</span>
                      {u.full_name && <span className="sub">{u.full_name}</span>}
                      {(u.phone || u.cnic) && (
                        <span className="contact mono">{[u.phone, u.cnic && `CNIC ${u.cnic}`].filter(Boolean).join(' · ')}</span>
                      )}
                      {self && <span className="sub">You · {u.email}</span>}
                    </td>
                    <td>
                      <label className="sr-only" htmlFor={`role-${u.id}`}>Role for {u.username}</label>
                      <select
                        id={`role-${u.id}`}
                        value={u.role}
                        disabled={self || busy === u.id}
                        onChange={(e) => patch(u, { role: e.target.value },
                          e.target.value === 'admin' ? `Give ${u.username} full admin access?` : `Remove admin access from ${u.username}?`)}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td><span className={`badge ${u.is_active ? 'badge-ok' : 'badge-off'}`}>{u.is_active ? 'Active' : 'Disabled'}</span></td>
                    <td className="mono small">{u.last_sign_in_at ? formatDateTime(u.last_sign_in_at) : 'Never'}</td>
                    <td className="row-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDialog({ type: 'details', user: u })} disabled={busy === u.id}>
                        <Icon name="edit" size={16} /> Edit details
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDialog({ type: 'reset', user: u })} disabled={busy === u.id}>
                        <Icon name="key" size={16} /> Reset password
                      </button>
                      {!self && (
                        <button
                          type="button"
                          className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-ghost'}`}
                          disabled={busy === u.id}
                          onClick={() => patch(u, { is_active: !u.is_active },
                            u.is_active ? `Disable ${u.username}? They will be signed out and unable to sign in. Their records are kept.` : null)}
                        >
                          {u.is_active ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialog?.type === 'create' && (
        <Modal title="New user" onClose={closeDialog}>
          <CreateUserForm onCreated={load} onCancel={closeDialog} />
        </Modal>
      )}
      {dialog?.type === 'details' && (
        <Modal title={`Details · ${dialog.user.username}`} onClose={closeDialog} size="lg">
          <ProfileDetailsForm
            initial={dialog.user}
            onCancel={closeDialog}
            onSave={async (values) => {
              await adminApi(`/api/admin/users/${dialog.user.id}`, { method: 'PATCH', body: values });
              await load();
            }}
          />
        </Modal>
      )}
      {dialog?.type === 'reset' && (
        <Modal title="Reset password" onClose={closeDialog}>
          <ResetPasswordForm user={dialog.user} onCancel={closeDialog} />
        </Modal>
      )}
    </section>
  );
}
