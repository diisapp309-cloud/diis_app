'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { isConfigured } from '@/lib/config';
import ConfigMissing from '@/components/ConfigMissing';

export default function Home() {
  const { session, profile, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !isConfigured) return;
    router.replace(session && profile ? (isAdmin ? '/admin' : '/records') : '/login');
  }, [loading, session, profile, isAdmin, router]);

  if (!isConfigured) return <ConfigMissing />;
  return <div className="center-screen" role="status"><span className="spinner" aria-hidden="true" /> Loading…</div>;
}
