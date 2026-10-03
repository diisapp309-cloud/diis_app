'use client';

import { useState } from 'react';
import { DETAIL_FIELDS, cleanDetails } from '@/lib/profile';

// Optional personal details. `onSave(values)` must persist them and throw on failure.
export default function ProfileDetailsForm({ initial, onSave, onCancel, submitLabel = 'Save details' }) {
  const [v, setV] = useState(() => Object.fromEntries(DETAIL_FIELDS.map((f) => [f.key, initial?.[f.key] ?? ''])));
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ saving: false, error: '', saved: false });

  const set = (k) => (e) => {
    setV((s) => ({ ...s, [k]: e.target.value }));
    setStatus((s) => ({ ...s, saved: false }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }));
  };

  async function submit(e) {
    e.preventDefault();
    const { values, errors: found } = cleanDetails(v);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`d-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setStatus({ saving: true, error: '', saved: false });
    try {
      await onSave(values);
      setV(Object.fromEntries(DETAIL_FIELDS.map((f) => [f.key, values[f.key] ?? ''])));
      setStatus({ saving: false, error: '', saved: true });
    } catch (err) {
      setStatus({ saving: false, error: err.message || 'Could not save.', saved: false });
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid-2">
        {DETAIL_FIELDS.map((f) => {
          const props = {
            id: `d-${f.key}`,
            name: f.key,
            value: v[f.key],
            onChange: set(f.key),
            maxLength: f.max,
            autoComplete: f.autoComplete,
            inputMode: f.inputMode,
            placeholder: f.placeholder,
            'aria-invalid': errors[f.key] ? true : undefined,
            'aria-describedby': errors[f.key] ? `d-${f.key}-err` : undefined,
          };
          return (
            <div key={f.key} className={`field ${errors[f.key] ? 'has-error' : ''} ${f.multiline ? 'span-2' : ''}`}>
              <label htmlFor={props.id}>{f.label} <span className="muted">(optional)</span></label>
              {f.multiline ? <textarea rows={2} {...props} /> : <input type={f.type || 'text'} {...props} />}
              {errors[f.key] && <p className="field-error" id={`d-${f.key}-err`}>{errors[f.key]}</p>}
            </div>
          );
        })}
      </div>

      {status.error && <p className="alert alert-error" role="alert">{status.error}</p>}
      {status.saved && <p className="alert alert-ok" role="status">Details saved.</p>}

      <div className="form-actions">
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={status.saving}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={status.saving}>{status.saving ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}
