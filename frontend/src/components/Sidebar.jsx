// src/components/Sidebar.jsx — light beige/pink navigation (CelCheck-style).
// This module has no login page and no logout: accounts are handled by
// the Hotel Management System's login module.

import { useEffect, useState } from 'react';
import { Icon } from './icons';
import { store } from '../lib/store';
import logo from '../assets/logo.png';

const NAV = [
  { section: 'MAIN' },
  { id: 'dashboard', label: 'Executive Dashboard', icon: 'dashboard' },
  { id: 'reports', label: 'Reports', icon: 'reports' },
  { section: 'MANAGEMENT' },
  { id: 'budgets', label: 'Budgets & Targets', icon: 'wallet' },
  { id: 'decisions', label: 'Decision Tracking', icon: 'decisions' },
  { id: 'alerts', label: 'Operational Alerts', icon: 'bell', badge: true },
];

export function Sidebar({ page, go, mobileOpen, closeMobile }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let live = true;
    store.getAlerts({ status: 'unread' })
      .then((r) => { if (live) setUnread(r.unread ?? r.data?.length ?? 0); })
      .catch(() => {});
    return () => { live = false; };
  }, [page]);

  return (
    <>
      {/* mobile scrim */}
      <div
        className={`fixed inset-0 bg-ink/40 z-30 lg:hidden transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={closeMobile}
      />
      <aside
        className={`fixed lg:sticky z-40 inset-y-0 left-0 top-0 w-64 shrink-0 bg-sidebar border-r border-hairline
                    flex flex-col h-screen transition-transform duration-200
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Identity */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Hotel Management System logo" className="w-11 h-11 rounded-full object-cover shrink-0" />
            <div>
              <div className="font-display font-semibold text-ink leading-tight">Management Dept.</div>
              <div className="text-[10px] tracking-[0.14em] text-muted font-medium">HOTEL MANAGEMENT SYSTEM</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 py-2 space-y-1 overflow-y-auto nice-scroll">
          {NAV.map((item, i) => {
            if (item.section) {
              return (
                <div key={i} className="px-2 pt-4 pb-2 text-[10px] tracking-[0.14em] text-muted font-semibold">
                  {item.section}
                </div>
              );
            }
            const isActive = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { go(item.id); closeMobile(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${isActive ? 'bg-pill text-ink' : 'text-muted hover:bg-white hover:text-ink'}`}
              >
                <Icon name={item.icon} size={18} className={isActive ? 'text-accent-dark' : ''} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && unread > 0 && (
                  <span className="min-w-5 h-5 px-1 rounded-full bg-accent text-white text-[11px] font-bold grid place-items-center">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* System health */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 text-sm text-ink">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="font-medium">All systems online</span>
          </div>
          <div className="text-xs text-muted mt-1 ml-4">Shared hotel database connected</div>
        </div>

        <div className="mx-5 border-t border-hairline" />
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pill text-accent-dark grid place-items-center shrink-0">
              <Icon name="users" size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink truncate">Management Department</div>
              <div className="text-xs text-muted truncate">General Manager · Dept. Heads</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
