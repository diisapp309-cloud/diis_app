'use client';

import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import RecordsView from '@/components/RecordsView';

export default function RecordsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <RecordsView scope="mine" />
      </AppShell>
    </RequireAuth>
  );
}
