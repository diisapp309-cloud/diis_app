'use client';

import { useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { formatMoney, toDatetimeLocal } from '@/lib/format';

const NTN_PATTERN = /^[0-9][0-9-]{5,18}$/;

const EMPTY = {
  vehicle_number: '',
  record_at: '',
  sender_name: '',
  fbr_invoice_number: '',
  sender_ntn: '',
  goods_value: '',
  sales_tax: '',
  receiver_name: '',
  receiver_ntn: '',
  created_by: '',
};

function initialValues(record) {
  if (!record) return { ...EMPTY, record_at: toDatetimeLocal(new Date()) };
  return {
    ...EMPTY,
    ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, record[k] ?? ''])),
    record_at: toDatetimeLocal(record.record_at),
    goods_value: String(record.goods_value),
    sales_tax: String(record.sales_tax),
  };
}

function validate(v) {
  const e = {};
  const req = (k, label) => { if (!String(v[k]).trim()) e[k] = `${label} is required.`; };
  req('vehicle_number', 'Truck / vehicle number');
  req('record_at', 'Date and time');
  req('sender_name', 'Sender name');
  req('fbr_invoice_number', 'FBR invoice number');
  req('sender_ntn', 'Sender NTN');
  req('receiver_name', 'Receiver name');
  req('receiver_ntn', 'Receiver NTN');
  for (const k of ['sender_ntn', 'receiver_ntn']) {
    if (!e[k] && !NTN_PATTERN.test(v[k].trim())) e[k] = 'Use digits and dashes only, e.g. 1234567-8.';
  }
  for (const [k, label] of [['goods_value', 'Value of goods'], ['sales_tax', 'Sales tax']]) {
    const n = Number(v[k]);
    if (v[k] === '' || v[k] === null) e[k] = `${label} is required.`;
    else if (!Number.isFinite(n) || n < 0) e[k] = `${label} must be a number of 0 or more.`;
  }
  if (!e.record_at && Number.isNaN(new Date(v.record_at).getTime())) e.record_at = 'Enter a valid date and time.';
  return e;
}

function Field({ id, label, error, hint, children }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="field-error" id={`${id}-err`}>{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export default function RecordForm({ record, isAdmin, users = [], onSaved, onCancel }) {
  const editing = Boolean(record);
  const [v, setV] = useState(() => initialValues(record));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const total = useMemo(() => (Number(v.goods_value) || 0) + (Number(v.sales_tax) || 0), [v.goods_value, v.sales_tax]);

  const set = (k) => (e) => {
    setV((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }));
  };

  const input = (k, props = {}) => ({
    id: `f-${k}`,
    name: k,
    value: v[k],
    onChange: set(k),
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? `f-${k}-err` : undefined,
    ...props,
  });

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const found = validate(v);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`f-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    const payload = {
      vehicle_number: v.vehicle_number.trim().toUpperCase(),
      record_at: new Date(v.record_at).toISOString(),
      sender_name: v.sender_name.trim(),
      fbr_invoice_number: v.fbr_invoice_number.trim(),
      sender_ntn: v.sender_ntn.trim(),
      goods_value: Number(v.goods_value),
      sales_tax: Number(v.sales_tax),
      receiver_name: v.receiver_name.trim(),
      receiver_ntn: v.receiver_ntn.trim(),
    };
    if (isAdmin && !editing && v.created_by) payload.created_by = v.created_by;

    setSaving(true);
    const sb = getSupabase();
    const { data, error } = editing
      ? await sb.from('records').update(payload).eq('id', record.id).select()
      : await sb.from('records').insert(payload).select();
    setSaving(false);

    if (error) {
      setFormError(`Could not save: ${error.message}`);
      return;
    }
    if (!data?.length) {
      setFormError('This record is locked. Records can only be changed on the day they were submitted — ask the admin to change it.');
      return;
    }
    onSaved(data[0], editing ? 'updated' : 'created');
  }

  return (
    <form className="record-form" onSubmit={submit} noValidate>
      {isAdmin && !editing && users.length > 0 && (
        <Field id="f-created_by" label="Submit on behalf of" hint="Leave as yourself, or file the record under a user's account.">
          <select {...input('created_by')}>
            <option value="">Myself (admin)</option>
            {users.filter((u) => u.role !== 'admin').map((u) => (
              <option key={u.id} value={u.id}>{u.full_name ? `${u.full_name} (${u.username})` : u.username}</option>
            ))}
          </select>
        </Field>
      )}

      <fieldset>
        <legend>Vehicle</legend>
        <div className="grid-2">
          <Field id="f-vehicle_number" label="Truck / vehicle number" error={errors.vehicle_number}>
            <input {...input('vehicle_number', { autoComplete: 'off', maxLength: 32, placeholder: 'e.g. TLB-482', className: 'mono upper' })} />
          </Field>
          <Field id="f-record_at" label="Date and time" error={errors.record_at}>
            <input {...input('record_at', { type: 'datetime-local' })} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>Sender</legend>
        <div className="grid-2">
          <Field id="f-sender_name" label="Name of sender" error={errors.sender_name}>
            <input {...input('sender_name', { maxLength: 200, autoComplete: 'organization' })} />
          </Field>
          <Field id="f-sender_ntn" label="NTN of sender" error={errors.sender_ntn}>
            <input {...input('sender_ntn', { maxLength: 20, inputMode: 'numeric', className: 'mono' })} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>Receiver</legend>
        <div className="grid-2">
          <Field id="f-receiver_name" label="Name of receiver" error={errors.receiver_name}>
            <input {...input('receiver_name', { maxLength: 200 })} />
          </Field>
          <Field id="f-receiver_ntn" label="NTN of receiver" error={errors.receiver_ntn}>
            <input {...input('receiver_ntn', { maxLength: 20, inputMode: 'numeric', className: 'mono' })} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>Invoice</legend>
        <Field id="f-fbr_invoice_number" label="FBR digital invoice number" error={errors.fbr_invoice_number}>
          <input {...input('fbr_invoice_number', { maxLength: 100, autoComplete: 'off', className: 'mono' })} />
        </Field>
        <div className="grid-2">
          <Field id="f-goods_value" label="Value of goods (Rs)" error={errors.goods_value}>
            <input {...input('goods_value', { type: 'number', min: 0, step: '0.01', inputMode: 'decimal', className: 'mono' })} />
          </Field>
          <Field id="f-sales_tax" label="Sales tax involved (Rs)" error={errors.sales_tax}>
            <input {...input('sales_tax', { type: 'number', min: 0, step: '0.01', inputMode: 'decimal', className: 'mono' })} />
          </Field>
        </div>
        <p className="total-line">Total incl. sales tax <strong className="mono">{formatMoney(total)}</strong></p>
      </fieldset>

      {formError && <p className="alert alert-error" role="alert">{formError}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Submit record'}
        </button>
      </div>
    </form>
  );
}
