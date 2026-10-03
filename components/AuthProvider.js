'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { isConfigured } from '@/lib/config';

const AuthContext = createContext(null);

const PROFILE_COLUMNS = 'id, username, full_name, role, is_active, phone, cnic, contact_email, company, address, updated_at';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isConfigured);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!isConfigured) return;
    const sb = getSupabase();
    let active = true;

    async function apply(next) {
      if (!next) {
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      const { data, error } = await sb
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', next.user.id)
        .maybeSingle();
      if (!active) return;

      if (error || !data || !data.is_active) {
        setNotice(
          error ? `Could not load your account: ${error.message}`
            : !data ? 'This account has no profile yet. Ask the admin to run the database setup.'
            : 'This account has been disabled. Contact the admin.'
        );
        await sb.auth.signOut();
        return;
      }
      setSession(next);
      setProfile(data);
      setLoading(false);
    }

    sb.auth.getSession().then(({ data }) => apply(data.session));

    const { data: sub } = sb.auth.onAuthStateChange((event, next) => {
      if (event === 'INITIAL_SESSION') return;
      if (event === 'TOKEN_REFRESHED') { setSession(next); return; }
      // Defer: calling Supabase inside this callback can deadlock the auth lock.
      setTimeout(() => apply(next), 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    setNotice('');
    await getSupabase().auth.signOut();
  }, []);

  // Lets the account page show saved details without a reload.
  const updateProfile = useCallback((patch) => setProfile((p) => (p ? { ...p, ...patch } : p)), []);

  return (
    <AuthContext.Provider value={{ session, profile, loading, notice, setNotice, signOut, updateProfile, isAdmin: profile?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
