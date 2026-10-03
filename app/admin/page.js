'use client';

import { useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import RecordsView from '@/components/RecordsView';
import UsersPanel from '@/components/UsersPanel';
import Icon from '@/components/Icon';

const TABS = [
  { id: 'records', label: 'All records', icon: 'list' },
  { id: 'users', label: 'Users', icon: 'users' },
];

export default function AdminPage() {
  const [tab, setTab] = useState('records');

  return (
    <RequireAuth admin>
      <AppShell>
        <div className="tabs" role="tablist" aria-label="Admin sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              className="tab"
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} size={16} /> {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'records' ? <RecordsView scope="all" /> : <UsersPanel />}
        </div>
      </AppShell>
    </RequireAuth>
  );
}
