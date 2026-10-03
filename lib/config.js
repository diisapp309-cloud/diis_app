export const APP_NAME = 'Digital Invoice Integrity System';

// Records lock for normal users at midnight in this time zone (must match pk_date() in schema.sql).
export const TIME_ZONE = 'Asia/Karachi';

// Admin-created users sign in with a username; Supabase Auth stores it as username@domain.
export const USERNAME_DOMAIN = process.env.NEXT_PUBLIC_USERNAME_DOMAIN || 'users.diis.app';

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export function toLoginEmail(identifier) {
  const id = identifier.trim().toLowerCase();
  return id.includes('@') ? id : `${id}@${USERNAME_DOMAIN}`;
}

export const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
