import { HttpError, handle, readJson, requireAdmin } from '@/lib/server/admin';
import { cleanDetails } from '@/lib/profile';

export const dynamic = 'force-dynamic';

const FOREVER = '876000h'; // ~100 years; Supabase's way to block sign-in

// Reset password, enable/disable, change role, or edit optional details.
export const PATCH = handle(async (request, { params }) => {
  const { sb, adminId } = await requireAdmin(request);
  const { id } = await params;
  const body = await readJson(request);

  if (id === adminId && (body.is_active === false || body.role === 'user')) {
    throw new HttpError(400, 'You cannot disable or demote your own admin account.');
  }

  const { data: existing } = await sb.from('profiles').select('id').eq('id', id).maybeSingle();
  if (!existing) throw new HttpError(404, 'User not found.');

  if (body.password !== undefined) {
    const password = String(body.password);
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');
    const { error } = await sb.auth.admin.updateUserById(id, { password });
    if (error) throw new HttpError(400, error.message);
  }

  const profileUpdate = {};

  if (typeof body.is_active === 'boolean') {
    const { error } = await sb.auth.admin.updateUserById(id, {
      ban_duration: body.is_active ? 'none' : FOREVER,
    });
    if (error) throw new HttpError(400, error.message);
    profileUpdate.is_active = body.is_active;
  }
  if (body.role !== undefined) {
    if (!['admin', 'user'].includes(body.role)) throw new HttpError(400, 'Role must be admin or user.');
    profileUpdate.role = body.role;
  }
  const { values: details, errors } = cleanDetails(body);
  if (Object.keys(errors).length) throw new HttpError(400, Object.values(errors)[0]);
  Object.assign(profileUpdate, details);

  if (Object.keys(profileUpdate).length) {
    const { error } = await sb.from('profiles').update(profileUpdate).eq('id', id);
    if (error) throw new HttpError(500, error.message);
  }

  return Response.json({ ok: true });
});
