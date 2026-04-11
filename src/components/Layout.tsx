import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router';
import { LayoutDashboard, Package, AlertTriangle, ArrowLeftRight, Clock as ClockIcon, Globe, Moon, Sun, FileText, Trash2, Settings } from 'lucide-react';
import { useTranslation, useAppStore } from '../lib/i18n';
import { Toaster } from 'react-hot-toast';
import GlobalSearch from './GlobalSearch';

function Clock() {
  const { isRtl } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
      {currentTime.toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </p>
  );
}

export default function Layout() {
  const { t, isRtl } = useTranslation();
  const { toggleLanguage, toggleTheme, theme, setSearchQuery } = useAppStore();
  const location = useLocation();

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
    { to: '/shifts', icon: ClockIcon, label: t('shifts') },
  ];

  return (
    <div className={`min-h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top App Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 transition-colors duration-200 px-4 py-3 pt-safe pl-safe pr-safe">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-sm shrink-0">
              ص
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white leading-tight">صيدليتي</h1>
              <Clock />
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Link to="/settings" onClick={() => setSearchQuery('')} className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <Settings size={18} className="sm:w-5 sm:h-5" />
            </Link>
            <Link to="/deleted" onClick={() => setSearchQuery('')} className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <Trash2 size={18} className="sm:w-5 sm:h-5" />
            </Link>
            <button onClick={toggleTheme} className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              {theme === 'light' ? <Moon size={18} className="sm:w-5 sm:h-5" /> : <Sun size={18} className="sm:w-5 sm:h-5" />}
            </button>
            <button onClick={toggleLanguage} className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <Globe size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
        
        {/* Global Search Bar */}
        <GlobalSearch />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 py-4 sm:py-6 max-w-3xl mx-auto w-full pl-safe pr-safe">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 fixed bottom-0 w-full pb-safe z-20 transition-colors duration-200 pl-safe pr-safe">
        <div className="flex justify-between items-center h-14 sm:h-16 max-w-3xl mx-auto px-1 sm:px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSearchQuery('')}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`
              }
            >
              <item.icon size={20} className="sm:w-6 sm:h-6" />
              <span className="text-[9px] sm:text-[10px] font-medium text-center leading-tight px-0.5">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      <Toaster position="top-center" />
    </div>
  );
}
