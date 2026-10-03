'use client';

import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import ProfileDetailsForm from '@/components/ProfileDetailsForm';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import { useAuth } from '@/components/AuthProvider';
import { getSupabase } from '@/lib/supabase';

function Account() {
  const { profile, isAdmin, updateProfile } = useAuth();

  async function saveDetails(values) {
    const { data, error } = await getSupabase()
      .from('profiles')
      .update(values)
      .eq('id', profile.id)
      .select('full_name, phone, cnic, contact_email, company, address, updated_at');
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error('Your details could not be saved. Please sign in again.');
    updateProfile(data[0]);
  }

  return (
    <div className="account">
      <div className="records-head">
        <div>
          <h1 className="h1">My account</h1>
          <p className="muted">Keep your contact details up to date and change your password.</p>
        </div>
      </div>

      <section className="panel" aria-labelledby="acc-login">
        <h2 id="acc-login" className="panel-title">Sign-in</h2>
        <dl className="detail-grid">
          <div><dt>Username</dt><dd className="mono">{profile.username}</dd></div>
          <div><dt>Role</dt><dd>{isAdmin ? 'Admin' : 'User'}</dd></div>
        </dl>
        <p className="field-hint">Only the admin can change your username or role.</p>
      </section>

      <section className="panel" aria-labelledby="acc-details">
        <h2 id="acc-details" className="panel-title">Personal details</h2>
        <ProfileDetailsForm initial={profile} onSave={saveDetails} />
      </section>

      <section className="panel" aria-labelledby="acc-password">
        <h2 id="acc-password" className="panel-title">Change password</h2>
        <ChangePasswordForm />
        <p className="field-hint">Forgot your current password? Ask the admin to reset it.</p>
      </section>
    </div>
  );
}

export default function AccountPage() {
  return (
    <RequireAuth>
      <AppShell>
        <Account />
      </AppShell>
    </RequireAuth>
  );
}
