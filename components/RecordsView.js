'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import {
  formatDateTime, formatDayHeading, formatMoney, formatTime, localDayKey,
  periodLabel, periodRange, pkDayKey, shiftAnchor, toDatetimeLocal,
} from '@/lib/format';
import Icon from './Icon';
import Modal from './Modal';
import RecordForm from './RecordForm';
import RecordHistory from './RecordHistory';

const MODES = [
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
  { id: 'month', label: 'Monthly' },
  { id: 'range', label: 'Custom' },
];

const SEARCH_FIELDS = [
  { id: 'all', label: 'All fields' },
  { id: 'vehicle_number', label: 'Vehicle no.' },
  { id: 'sender_name', label: 'Sender' },
  { id: 'receiver_name', label: 'Receiver' },
  { id: 'fbr_invoice_number', label: 'FBR invoice no.' },
  { id: 'ntn', label: 'NTN' },
];
const TEXT_COLUMNS = ['vehicle_number', 'sender_name', 'receiver_name', 'fbr_invoice_number', 'sender_ntn', 'receiver_ntn'];

const SELECT = '*, owner:profiles!records_created_by_fkey(username, full_name), editor:profiles!records_updated_by_fkey(username)';
const LIMIT = 2000;

// PostgREST filter syntax uses , ( ) " * as operators; strip them from free text.
const cleanTerm = (s) => s.replace(/[,()"*%\\]/g, ' ').replace(/\s+/g, ' ').trim();

function toCsv(rows, withOwner) {
  const cols = [
    ['Date & time', (r) => toDatetimeLocal(r.record_at).replace('T', ' ')],
    ['Vehicle number', (r) => r.vehicle_number],
    ['Sender', (r) => r.sender_name],
    ['Sender NTN', (r) => r.sender_ntn],
    ['Receiver', (r) => r.receiver_name],
    ['Receiver NTN', (r) => r.receiver_ntn],
    ['FBR invoice number', (r) => r.fbr_invoice_number],
    ['Value of goods', (r) => r.goods_value],
    ['Sales tax', (r) => r.sales_tax],
    ...(withOwner ? [['Submitted by', (r) => r.owner?.username ?? '']] : []),
    ['Submitted at', (r) => toDatetimeLocal(r.created_at).replace('T', ' ')],
  ];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.map(([h]) => esc(h)).join(','), ...rows.map((r) => cols.map(([, f]) => esc(f(r))).join(','))].join('\r\n');
}

export default function RecordsView({ scope = 'mine' }) {
  const { profile, isAdmin } = useAuth();
  const showOwner = scope === 'all';

  const [mode, setMode] = useState('day');
  const [anchor, setAnchor] = useState(() => new Date());
  const [rangeFrom, setRangeFrom] = useState(() => localDayKey(new Date(Date.now() - 6 * 864e5)));
  const [rangeTo, setRangeTo] = useState(() => localDayKey(new Date()));
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const [field, setField] = useState('all');
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [state, setState] = useState({ status: 'loading', rows: [], error: '' });
  const [slow, setSlow] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [dialog, setDialog] = useState(null); // { type: 'create' | 'edit' | 'history', record? }
  const [toast, setToast] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(cleanTerm(term)), 300);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    if (!isAdmin) return;
    getSupabase().from('profiles').select('id, username, full_name, role').order('username')
      .then(({ data }) => setUsers(data || []));
  }, [isAdmin]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const range = useMemo(() => {
    if (mode !== 'range') return periodRange(mode, anchor);
    const from = new Date(`${rangeFrom}T00:00`);
    const to = new Date(`${rangeTo}T00:00`);
    to.setDate(to.getDate() + 1);
    return { from, to };
  }, [mode, anchor, rangeFrom, rangeTo]);

  const rangeValid = !Number.isNaN(range.from.getTime()) && !Number.isNaN(range.to.getTime()) && range.from < range.to;

  useEffect(() => {
    if (!rangeValid) {
      setState({ status: 'error', rows: [], error: 'Choose a start date that is on or before the end date.' });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading', error: '' }));
    setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), 15000);

    let q = getSupabase().from('records').select(SELECT)
      .gte('record_at', range.from.toISOString())
      .lt('record_at', range.to.toISOString())
      .order('record_at', { ascending: false })
      .limit(LIMIT);

    if (scope === 'mine') q = q.eq('created_by', profile.id);
    else if (userId) q = q.eq('created_by', userId);

    if (query) {
      const cols = field === 'all' ? TEXT_COLUMNS : field === 'ntn' ? ['sender_ntn', 'receiver_ntn'] : [field];
      q = q.or(cols.map((c) => `${c}.ilike."*${query}*"`).join(','));
    }

    q.then(({ data, error }) => {
      clearTimeout(slowTimer);
      if (cancelled) return;
      setState(error ? { status: 'error', rows: [], error: error.message } : { status: 'ready', rows: data, error: '' });
    });
    return () => { cancelled = true; clearTimeout(slowTimer); };
  }, [range, rangeValid, scope, userId, query, field, profile.id, reloadKey]);

  const rows = state.rows;
  const totals = useMemo(() => rows.reduce(
    (t, r) => ({ value: t.value + Number(r.goods_value), tax: t.tax + Number(r.sales_tax) }),
    { value: 0, tax: 0 }
  ), [rows]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = localDayKey(r.record_at);
      if (!map.has(key)) map.set(key, { key, date: r.record_at, rows: [], value: 0, tax: 0 });
      const g = map.get(key);
      g.rows.push(r);
      g.value += Number(r.goods_value);
      g.tax += Number(r.sales_tax);
    }
    return [...map.values()];
  }, [rows]);

  const today = pkDayKey(new Date());
  const canEdit = useCallback(
    (r) => isAdmin || (r.created_by === profile.id && pkDayKey(r.created_at) === today),
    [isAdmin, profile.id, today]
  );

  const filtersActive = Boolean(term || userId || field !== 'all');
  const clearFilters = () => { setTerm(''); setQuery(''); setUserId(''); setField('all'); };
  const reload = () => setReloadKey((k) => k + 1);
  const closeDialog = useCallback(() => setDialog(null), []);

  function onSaved(saved, how) {
    setDialog(null);
    setToast(how === 'created' ? 'Record submitted.' : 'Changes saved.');
    reload();
  }

  async function remove(r) {
    if (!window.confirm(`Delete the record for ${r.vehicle_number} (invoice ${r.fbr_invoice_number})? This cannot be undone, but it stays in the change history.`)) return;
    const { error } = await getSupabase().from('records').delete().eq('id', r.id);
    if (error) setToast(`Delete failed: ${error.message}`);
    else { setToast('Record deleted.'); setExpanded(null); reload(); }
  }

  function exportCsv() {
    const blob = new Blob(['﻿' + toCsv(rows, showOwner)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `diis-records_${localDayKey(range.from)}_${localDayKey(new Date(range.to.getTime() - 1))}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section className="records" aria-labelledby="records-title">
      <div className="records-head">
        <div>
          <h1 id="records-title" className="h1">{scope === 'all' ? 'All records' : 'My records'}</h1>
          <p className="muted">
            {scope === 'all'
              ? 'Every submission from every user. As admin you can add, edit and delete any record.'
              : isAdmin ? 'Records filed under your own admin account.'
              : 'You can edit a record on the day you submitted it. After midnight it is locked.'}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDialog({ type: 'create' })}>
          <Icon name="plus" /> New record
        </button>
      </div>

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Period">
          {MODES.map((m) => (
            <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>
          ))}
        </div>

        {mode === 'range' ? (
          <div className="range-inputs">
            <label className="sr-only" htmlFor="range-from">From</label>
            <input id="range-from" type="date" value={rangeFrom} max={rangeTo} onChange={(e) => setRangeFrom(e.target.value)} />
            <span aria-hidden="true">–</span>
            <label className="sr-only" htmlFor="range-to">To</label>
            <input id="range-to" type="date" value={rangeTo} min={rangeFrom} onChange={(e) => setRangeTo(e.target.value)} />
          </div>
        ) : (
          <div className="period-nav">
            <button type="button" className="icon-btn" aria-label="Previous period" onClick={() => setAnchor((a) => shiftAnchor(mode, a, -1))}><Icon name="left" /></button>
            <span className="period-label" aria-live="polite">{periodLabel(mode, range)}</span>
            <button type="button" className="icon-btn" aria-label="Next period" onClick={() => setAnchor((a) => shiftAnchor(mode, a, 1))}><Icon name="right" /></button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAnchor(new Date())}>Today</button>
          </div>
        )}
      </div>

      <div className="filters">
        <div className="search">
          <Icon name="search" size={16} />
          <label className="sr-only" htmlFor="search">Search records</label>
          <input id="search" type="search" placeholder="Search vehicle, sender, receiver, invoice, NTN…" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <label className="sr-only" htmlFor="search-field">Search in</label>
        <select id="search-field" value={field} onChange={(e) => setField(e.target.value)}>
          {SEARCH_FIELDS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        {showOwner && (
          <>
            <label className="sr-only" htmlFor="user-filter">Submitted by</label>
            <select id="user-filter" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">All users</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name ? `${u.full_name} (${u.username})` : u.username}</option>)}
            </select>
          </>
        )}
        {filtersActive && <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear filters</button>}
        <button type="button" className="btn btn-ghost btn-sm push-right" onClick={exportCsv} disabled={!rows.length}>
          <Icon name="download" size={16} /> Export CSV
        </button>
      </div>

      <dl className="summary" aria-live="polite">
        <div><dt>Records</dt><dd className="mono">{state.status === 'ready' ? rows.length : '—'}</dd></div>
        <div><dt>Value of goods</dt><dd className="mono">{state.status === 'ready' ? formatMoney(totals.value) : '—'}</dd></div>
        <div><dt>Sales tax</dt><dd className="mono">{state.status === 'ready' ? formatMoney(totals.tax) : '—'}</dd></div>
      </dl>

      {state.status === 'loading' && (
        <div className="state" role="status">
          <span className="spinner" aria-hidden="true" />
          <p>{slow ? 'This is taking longer than expected. Check your connection — it will keep trying.' : 'Loading records…'}</p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="state state-error" role="alert">
          <p><strong>Could not load records.</strong> {state.error}</p>
          {rangeValid && <button type="button" className="btn btn-ghost btn-sm" onClick={reload}><Icon name="refresh" size={16} /> Try again</button>}
        </div>
      )}

      {state.status === 'ready' && rows.length === 0 && (
        <div className="state">
          <p className="state-title">{filtersActive ? 'No records match these filters' : 'No records in this period'}</p>
          <p className="muted">
            {filtersActive ? 'Try another search term or clear the filters.' : 'Switch period with the arrows above, or add a new record.'}
          </p>
          {filtersActive
            ? <button type="button" className="btn btn-ghost" onClick={clearFilters}>Clear filters</button>
            : <button type="button" className="btn btn-primary" onClick={() => setDialog({ type: 'create' })}><Icon name="plus" /> New record</button>}
        </div>
      )}

      {state.status === 'ready' && rows.length > 0 && (
        <>
          {rows.length >= LIMIT && (
            <p className="alert">Showing the latest {LIMIT} records in this period. Narrow the period or filters to see the rest.</p>
          )}
          <ol className="log">
            {groups.map((g) => (
              <li key={g.key} className="log-day">
                <header className="log-day-head">
                  <h2>{formatDayHeading(g.date)}</h2>
                  <p className="mono">
                    {g.rows.length} {g.rows.length === 1 ? 'record' : 'records'} · {formatMoney(g.value)} · tax {formatMoney(g.tax)}
                  </p>
                </header>
                <ul className="log-rows">
                  {g.rows.map((r) => {
                    const open = expanded === r.id;
                    const editable = canEdit(r);
                    return (
                      <li key={r.id} className={`log-row ${open ? 'is-open' : ''}`}>
                        <button
                          type="button"
                          className="log-main"
                          aria-expanded={open}
                          aria-controls={`rec-${r.id}`}
                          onClick={() => setExpanded(open ? null : r.id)}
                        >
                          <time className="log-time mono" dateTime={r.record_at}>{formatTime(r.record_at)}</time>
                          <span className="plate">{r.vehicle_number}</span>
                          <span className="parties">
                            <span className="party">{r.sender_name}</span>
                            <Icon name="arrow" size={14} className="party-arrow" />
                            <span className="party">{r.receiver_name}</span>
                          </span>
                          <span className="log-inv mono" title="FBR invoice number">{r.fbr_invoice_number}</span>
                          <span className="log-amt mono">{formatMoney(r.goods_value)}</span>
                          <span className="log-tax mono">+{formatMoney(r.sales_tax)} tax</span>
                          {showOwner && <span className="log-owner">{r.owner?.username ?? '—'}</span>}
                          {r.updated_at && <span className="badge">edited</span>}
                          {!editable && <Icon name="lock" size={14} className="lock" />}
                        </button>

                        {open && (
                          <div className="log-detail" id={`rec-${r.id}`}>
                            <dl className="detail-grid">
                              <div><dt>Vehicle number</dt><dd className="mono">{r.vehicle_number}</dd></div>
                              <div><dt>Date and time</dt><dd>{formatDateTime(r.record_at)}</dd></div>
                              <div><dt>Sender</dt><dd>{r.sender_name}</dd></div>
                              <div><dt>Sender NTN</dt><dd className="mono">{r.sender_ntn}</dd></div>
                              <div><dt>Receiver</dt><dd>{r.receiver_name}</dd></div>
                              <div><dt>Receiver NTN</dt><dd className="mono">{r.receiver_ntn}</dd></div>
                              <div><dt>FBR digital invoice no.</dt><dd className="mono">{r.fbr_invoice_number}</dd></div>
                              <div><dt>Value of goods</dt><dd className="mono">{formatMoney(r.goods_value)}</dd></div>
                              <div><dt>Sales tax</dt><dd className="mono">{formatMoney(r.sales_tax)}</dd></div>
                              <div><dt>Total</dt><dd className="mono">{formatMoney(Number(r.goods_value) + Number(r.sales_tax))}</dd></div>
                              <div><dt>Submitted</dt><dd>{formatDateTime(r.created_at)}{showOwner && r.owner ? ` by ${r.owner.username}` : ''}</dd></div>
                              {r.updated_at && <div><dt>Last edited</dt><dd>{formatDateTime(r.updated_at)}{r.editor ? ` by ${r.editor.username}` : ''}</dd></div>}
                            </dl>
                            <div className="detail-actions">
                              {editable ? (
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDialog({ type: 'edit', record: r })}>
                                  <Icon name="edit" size={16} /> Edit
                                </button>
                              ) : (
                                <p className="muted small"><Icon name="lock" size={14} /> Locked — submitted on an earlier day. Only the admin can change it.</p>
                              )}
                              {isAdmin && (
                                <>
                                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDialog({ type: 'history', record: r })}>
                                    <Icon name="history" size={16} /> History
                                  </button>
                                  <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(r)}>
                                    <Icon name="trash" size={16} /> Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </>
      )}

      {dialog?.type === 'create' && (
        <Modal title="New record" onClose={closeDialog} size="lg">
          <RecordForm isAdmin={isAdmin} users={scope === 'all' ? users : []} onSaved={onSaved} onCancel={closeDialog} />
        </Modal>
      )}
      {dialog?.type === 'edit' && (
        <Modal title={`Edit record · ${dialog.record.vehicle_number}`} onClose={closeDialog} size="lg">
          <RecordForm record={dialog.record} isAdmin={isAdmin} onSaved={onSaved} onCancel={closeDialog} />
        </Modal>
      )}
      {dialog?.type === 'history' && (
        <Modal title={`Change history · ${dialog.record.vehicle_number}`} onClose={closeDialog}>
          <RecordHistory recordId={dialog.record.id} />
        </Modal>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}
