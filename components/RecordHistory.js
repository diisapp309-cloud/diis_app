'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { formatDateTime, formatMoney } from '@/lib/format';

export const FIELD_LABELS = {
  vehicle_number: 'Vehicle no.',
  record_at: 'Date & time',
  sender_name: 'Sender',
  sender_ntn: 'Sender NTN',
  receiver_name: 'Receiver',
  receiver_ntn: 'Receiver NTN',
  fbr_invoice_number: 'FBR invoice no.',
  goods_value: 'Value of goods',
  sales_tax: 'Sales tax',
};

function show(key, value) {
  if (value === null || value === undefined) return '—';
  if (key === 'record_at') return formatDateTime(value);
  if (key === 'goods_value' || key === 'sales_tax') return formatMoney(value);
  return String(value);
}

export default function RecordHistory({ recordId }) {
  const [state, setState] = useState({ status: 'loading', rows: [], error: '' });

  useEffect(() => {
    let cancelled = false;
    getSupabase()
      .from('record_history')
      .select('id, action, changed_at, old_data, new_data, changer:profiles!record_history_changed_by_fkey(username)')
      .eq('record_id', recordId)
      .order('changed_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        setState(error ? { status: 'error', rows: [], error: error.message } : { status: 'ready', rows: data, error: '' });
      });
    return () => { cancelled = true; };
  }, [recordId]);

  if (state.status === 'loading') return <p className="muted" role="status"><span className="spinner" /> Loading history…</p>;
  if (state.status === 'error') return <p className="alert alert-error">Could not load history: {state.error}</p>;
  if (!state.rows.length) return <p className="muted">No changes since this record was submitted.</p>;

  return (
    <ol className="history">
      {state.rows.map((h) => {
        const changes = Object.keys(FIELD_LABELS).filter(
          (k) => h.new_data && String(h.old_data[k]) !== String(h.new_data[k])
        );
        return (
          <li key={h.id}>
            <p className="history-head">
              <strong>{h.action === 'delete' ? 'Deleted' : 'Edited'}</strong> by {h.changer?.username ?? 'unknown'} ·{' '}
              <time className="mono">{formatDateTime(h.changed_at)}</time>
            </p>
            {h.action === 'update' && (
              changes.length ? (
                <table className="diff">
                  <tbody>
                    {changes.map((k) => (
                      <tr key={k}>
                        <th scope="row">{FIELD_LABELS[k]}</th>
                        <td className="diff-old">{show(k, h.old_data[k])}</td>
                        <td className="diff-new">{show(k, h.new_data[k])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="muted small">Saved without changing any field.</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
