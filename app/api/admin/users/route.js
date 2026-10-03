import { HttpError, handle, readJson, requireAdmin } from '@/lib/server/admin';
import { USERNAME_DOMAIN, USERNAME_PATTERN } from '@/lib/config';

export const dynamic = 'force-dynamic';

// List every account with its last sign-in.
export const GET = handle(async (request) => {
  const { sb } = await requireAdmin(request);

  const { data: profiles, error } = await sb
    .from('profiles')
    .select('id, username, full_name, role, is_active, created_at')
    .order('created_at', { ascending: true });
  if (error) throw new HttpError(500, error.message);

  const { data: authData, error: authError } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authError) throw new HttpError(500, authError.message);
  const byId = new Map(authData.users.map((u) => [u.id, u]));

  const users = profiles.map((p) => ({
    ...p,
    email: byId.get(p.id)?.email ?? null,
    last_sign_in_at: byId.get(p.id)?.last_sign_in_at ?? null,
  }));
  return Response.json({ users });
});

// Create an account with a username + password chosen by the admin.
export const POST = handle(async (request) => {
  const { sb } = await requireAdmin(request);
  const body = await readJson(request);

  const username = String(body.username || '').trim().toLowerCase();
  const fullName = String(body.full_name || '').trim().slice(0, 120) || null;
  const password = String(body.password || '');
  const role = body.role === 'admin' ? 'admin' : 'user';

  if (!USERNAME_PATTERN.test(username)) {
    throw new HttpError(400, 'Username must be 3–32 characters: lowercase letters, numbers, dot, dash or underscore.');
  }
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');

  const { data: taken } = await sb.from('profiles').select('id').eq('username', username).maybeSingle();
  if (taken) throw new HttpError(409, `The username “${username}” is already taken.`);

  const { data, error } = await sb.auth.admin.createUser({
    email: `${username}@${USERNAME_DOMAIN}`,
    password,
    email_confirm: true,
    user_metadata: { username, full_name: fullName },
  });
  if (error) throw new HttpError(400, error.message);

  // The on_auth_user_created trigger made the profile; set the fields the trigger can't know.
  const { error: profileError } = await sb
    .from('profiles')
    .update({ role, full_name: fullName, username })
    .eq('id', data.user.id);
  if (profileError) throw new HttpError(500, profileError.message);

  return Response.json({ user: { id: data.user.id, username, role } }, { status: 201 });
});
