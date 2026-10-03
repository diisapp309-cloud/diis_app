// Optional personal details on a profile. Shared by the browser forms and the admin API,
// and mirrored by the check constraints in supabase/schema.sql.
export const DETAIL_FIELDS = [
  { key: 'full_name', label: 'Full name', max: 120, autoComplete: 'name' },
  { key: 'phone', label: 'Phone number', max: 20, autoComplete: 'tel', inputMode: 'tel', placeholder: '+92 300 1234567' },
  { key: 'cnic', label: 'CNIC', max: 15, inputMode: 'numeric', placeholder: '12345-1234567-1' },
  { key: 'contact_email', label: 'Contact email', max: 254, autoComplete: 'email', inputMode: 'email', type: 'email' },
  { key: 'company', label: 'Company', max: 200, autoComplete: 'organization' },
  { key: 'address', label: 'Address', max: 300, autoComplete: 'street-address', multiline: true },
];

export const DETAIL_KEYS = DETAIL_FIELDS.map((f) => f.key);

const PHONE = /^\+?[0-9][0-9 -]{6,19}$/;
const CNIC = /^[0-9]{5}-[0-9]{7}-[0-9]$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// 1234512345671 -> 12345-1234567-1; anything else is returned trimmed for validation to reject.
export function normalizeCnic(value) {
  const digits = String(value).replace(/\D/g, '');
  return digits.length === 13 ? `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}` : String(value).trim();
}

// Returns { values, errors }. Empty strings become null (all fields are optional).
export function cleanDetails(input) {
  const values = {};
  const errors = {};
  for (const f of DETAIL_FIELDS) {
    if (!(f.key in input)) continue;
    let v = String(input[f.key] ?? '').trim();
    if (f.key === 'cnic' && v) v = normalizeCnic(v);
    if (f.key === 'contact_email') v = v.toLowerCase();
    if (v.length > f.max) errors[f.key] = `${f.label} can be at most ${f.max} characters.`;
    else if (v && f.key === 'phone' && !PHONE.test(v)) errors[f.key] = 'Use digits, spaces or dashes, e.g. +92 300 1234567.';
    else if (v && f.key === 'cnic' && !CNIC.test(v)) errors[f.key] = 'CNIC must be 13 digits, e.g. 12345-1234567-1.';
    else if (v && f.key === 'contact_email' && !EMAIL.test(v)) errors[f.key] = 'Enter a valid email address.';
    values[f.key] = v || null;
  }
  return { values, errors };
}
