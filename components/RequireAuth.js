'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { isConfigured } from '@/lib/config';
import ConfigMissing from './ConfigMissing';

export default function RequireAuth({ admin = false, children }) {
  const { session, profile, loading, isAdmin } = useAuth();
  const router = useRouter();
  const allowed = session && profile && (!admin || isAdmin);

  useEffect(() => {
    if (loading || !isConfigured) return;
    if (!session || !profile) router.replace('/login');
    else if (admin && !isAdmin) router.replace('/records');
  }, [loading, session, profile, admin, isAdmin, router]);

  if (!isConfigured) return <ConfigMissing />;
  if (!allowed) {
    return (
      <div className="center-screen" role="status">
        <span className="spinner" aria-hidden="true" /> Loading…
      </div>
    );
  }
  return children;
}
