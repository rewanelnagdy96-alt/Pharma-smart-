import React, { useEffect } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router';
import { LayoutDashboard, Package, AlertTriangle, ArrowLeftRight, Clock, Globe, Moon, Sun, Search, FileText, Trash2 } from 'lucide-react';
import { useTranslation, useAppStore } from '../lib/i18n';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const { t, isRtl } = useTranslation();
  const { toggleLanguage, toggleTheme, theme, searchQuery, setSearchQuery } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    setSearchQuery('');
  }, [location.pathname, setSearchQuery]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('dashboard') },
    { to: '/inventory', icon: Package, label: t('inventory') },
    { to: '/shortages', icon: AlertTriangle, label: t('shortages') },
    { to: '/ledger', icon: ArrowLeftRight, label: t('ledger') },
    { to: '/invoices', icon: FileText, label: t('invoices') },
    { to: '/shifts', icon: Clock, label: t('shifts') },
  ];

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top App Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 transition-colors duration-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-xl shadow-sm">
              P
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">PharmaSmart</h1>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/deleted" className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <Trash2 size={20} />
            </Link>
            <button onClick={toggleTheme} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button onClick={toggleLanguage} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <Globe size={20} />
            </button>
          </div>
        </div>
        
        {/* Global Search Bar */}
        <div className="relative">
          <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRtl ? 'right-4' : 'left-4'}`} size={20} />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white transition-colors ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 px-4 py-6 max-w-3xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 fixed bottom-0 w-full pb-safe z-20 transition-colors duration-200">
        <div className="flex justify-around items-center h-16 max-w-3xl mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`
              }
            >
              <item.icon size={24} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      <Toaster position="top-center" />
    </div>
  );
}
