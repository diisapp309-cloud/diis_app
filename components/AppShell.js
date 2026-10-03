'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { APP_NAME } from '@/lib/config';
import Icon from './Icon';

export default function AppShell({ children }) {
  const { profile, isAdmin, signOut } = useAuth();
  const pathname = usePathname();

  const links = [{ href: '/records', label: isAdmin ? 'My entries' : 'My records', icon: 'list' }];
  if (isAdmin) links.unshift({ href: '/admin', label: 'Admin', icon: 'shield' });

  return (
    <div className="shell">
      <header className="topbar">
        <Link href={isAdmin ? '/admin' : '/records'} className="brand">
          <span className="brand-mark"><Icon name="truck" size={20} /></span>
          <span className="brand-name">{APP_NAME}</span>
        </Link>
        <nav className="topnav" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="topnav-link" aria-current={pathname === l.href ? 'page' : undefined}>
              <Icon name={l.icon} size={16} /> <span>{l.label}</span>
            </Link>
          ))}
        </nav>
        <div className="topbar-user">
          <span className="who">
            <span className="who-name">{profile.full_name || profile.username}</span>
            <span className={`badge ${isAdmin ? 'badge-accent' : ''}`}>{isAdmin ? 'Admin' : profile.username}</span>
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={signOut}>
            <Icon name="logout" size={16} /> <span className="hide-sm">Sign out</span>
          </button>
        </div>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
