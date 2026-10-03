import { createClient } from '@supabase/supabase-js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Secret-key client. Bypasses row level security, so it only ever runs on the server.
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError(500, 'Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it in Vercel → Settings → Environment Variables.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Verifies the caller's Supabase access token and that they are an active admin.
export async function requireAdmin(request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || token === 'null') throw new HttpError(401, 'Not signed in.');

  const sb = serviceClient();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Your session expired. Sign in again.');

  const { data: profile } = await sb
    .from('profiles').select('role, is_active').eq('id', data.user.id).maybeSingle();
  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    throw new HttpError(403, 'Only the admin can do this.');
  }
  return { sb, adminId: data.user.id };
}

export function handle(fn) {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (e) {
      return Response.json({ error: e.message || 'Unexpected error' }, { status: e.status || 500 });
    }
  };
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'Invalid request body.');
  }
}
