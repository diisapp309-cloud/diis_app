import { createClient } from '@supabase/supabase-js';

let client;

// Browser client. Uses the publishable/anon key; row level security decides what each user can touch.
export function getSupabase() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'diis-auth' } }
    );
  }
  return client;
}

export async function getAccessToken() {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

// Calls the admin API routes with the signed-in user's token.
export async function adminApi(path, { method = 'GET', body } = {}) {
  const token = await getAccessToken();
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}
