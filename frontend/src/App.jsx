// src/App.jsx — Management Department module shell: sidebar layout +
// state-based navigation. There is deliberately NO login page here:
// authentication belongs to the Hotel Management System's login module,
// and this module opens straight into the Executive Dashboard.

import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Icon } from './components/icons';
import { Dashboard } from './pages/Dashboard';
import { Reports } from './pages/Reports';
import { Budgets } from './pages/Budgets';
import { Decisions } from './pages/Decisions';
import { Alerts } from './pages/Alerts';

const TITLES = {
  dashboard: 'Executive Dashboard',
  reports: 'Reports',
  budgets: 'Budgets & Targets',
  decisions: 'Decision Tracking',
  alerts: 'Operational Alerts',
};

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  // The dashboard hides its scrollbar (still scrollable), like CelCheck.
  useEffect(() => {
    document.documentElement.classList.toggle('no-scrollbar', page === 'dashboard');
    return () => document.documentElement.classList.remove('no-scrollbar');
  }, [page]);

  const go = (p) => {
    setPage(p);
    setMobileOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-cream flex">
      <Sidebar page={page} go={go} mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0">
        {/* mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 bg-sidebar/95 backdrop-blur border-b border-hairline px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 text-ink" aria-label="Open menu">
            <Icon name="menu" size={20} />
          </button>
          <span className="font-display font-semibold text-ink">{TITLES[page]}</span>
        </div>
        <main>
          {page === 'dashboard' && <Dashboard go={go} />}
          {page === 'reports' && <Reports />}
          {page === 'budgets' && <Budgets />}
          {page === 'decisions' && <Decisions />}
          {page === 'alerts' && <Alerts />}
        </main>
      </div>
    </div>
  );
}
