import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onToggleAdmin: () => void;
  onLogoClick: () => void;
  onLogout: () => void;
  onNavigate?: (view: string) => void;
  onToggleCurrency?: () => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
  userName?: string;
  userAvatar?: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({
  onToggleAdmin,
  onLogoClick,
  onLogout,
  onNavigate,
  onToggleCurrency,
  isAdmin,
  isAuthenticated,
  userName,
  userAvatar,
  theme,
  onToggleTheme
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleNav = (path: string) => {
    setShowDropdown(false);
    if (isAdmin) {
      // Since admin dash is SPA internal, we might need a way to pass sub-view or just link
      navigate('/admin');
      // Note: To deep link to tabs in admin dash, we'd need URL params or Context, keeping simple for now
    } else {
      if (['inquiries', 'profile', 'documents', 'settings', 'help'].includes(path)) {
        navigate('/user');
        // Future improvement: navigate(`/user?tab=${path}`);
      }
    }
  };

  return (
    <nav className="bg-white/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <div
          onClick={() => { setShowDropdown(false); onLogoClick(); }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-[0_5px_0_rgb(49,46,129)] active:shadow-none active:translate-y-[5px] transition-all group-hover:rotate-3 border-t-2 border-l-2 border-indigo-400">
            <span className="drop-shadow-md">MR</span>
          </div>
          <div className="leading-tight hidden sm:block">
            <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white block">MedRussia</span>
            <span className="text-indigo-500 text-[10px] font-black uppercase tracking-widest">MBBS Decision Support Platform</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 relative">

          {/* Compare Button (Visible on Desktop) */}
          <button
            onClick={() => navigate('/compare')}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-white transition-all"
          >
            <span>⚖️</span> Compare
          </button>

          {/* Our Team Button (Visible on Desktop) */}
          <button
            onClick={() => navigate('/team')}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase hover:bg-purple-50 dark:hover:bg-slate-700 hover:text-purple-600 dark:hover:text-white transition-all"
          >
            <span>👥</span> Our Team
          </button>

          {/* Currency Toggle */}
          {onToggleCurrency && (
            <button
              onClick={onToggleCurrency}
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all"
              title="Currency Converter"
            >
              <span className="text-xl">💱</span>
            </button>
          )}

          <button
            onClick={onToggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 pl-2 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black uppercase shadow-inner overflow-hidden">
                  {userAvatar ? (
                    <img src={userAvatar} alt="U" className="w-full h-full object-cover" />
                  ) : (
                    userName?.charAt(0) || 'U'
                  )}
                </div>
                <span className="text-sm font-black text-slate-700 dark:text-slate-200 hidden md:inline">
                  {isAdmin ? 'Admin Panel' : 'My Hub'}
                </span>
                <span className={`text-[10px] text-slate-400 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {showDropdown && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700 py-2 animate-in fade-in zoom-in duration-200 ring-1 ring-black/5">
                  <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-700 mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged in as</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{userName}</p>
                  </div>

                  <div className="space-y-1 px-1">
                    <button
                      onClick={() => handleNav('inquiries')}
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-white rounded-xl flex items-center gap-3 transition-all"
                    >
                      <span className="text-lg">🏠</span> Dashboard
                    </button>

                    <button
                      onClick={() => { setShowDropdown(false); navigate('/compare'); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-white rounded-xl flex items-center gap-3 transition-all md:hidden"
                    >
                      <span className="text-lg">⚖️</span> Compare Unis
                    </button>

                    {!isAdmin && (
                      <>
                        <button
                          onClick={() => handleNav('profile')}
                          className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-white rounded-xl flex items-center gap-3 transition-all"
                        >
                          <span className="text-lg">👤</span> Edit Profile
                        </button>
                        <button
                          onClick={() => handleNav('documents')}
                          className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-white rounded-xl flex items-center gap-3 transition-all"
                        >
                          <span className="text-lg">📁</span> My Vault
                        </button>
                        <button
                          onClick={() => handleNav('settings')}
                          className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-white rounded-xl flex items-center gap-3 transition-all"
                        >
                          <span className="text-lg">⚙️</span> Settings
                        </button>
                        <button
                          onClick={() => handleNav('help')}
                          className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-white rounded-xl flex items-center gap-3 transition-all"
                        >
                          <span className="text-lg">❓</span> Help Center
                        </button>
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-50 dark:border-slate-700 mt-2 pt-2 px-1">
                    <button
                      onClick={() => { setShowDropdown(false); onLogout(); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl flex items-center gap-3 transition-all"
                    >
                      <span className="text-lg">🚪</span> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => navigate('/compare')}
                className="md:hidden flex items-center justify-center w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all"
              >
                <span>⚖️</span>
              </button>
              <button
                onClick={onToggleAdmin}
                className="px-6 py-2.5 rounded-2xl text-sm font-black transition-all duration-300 shadow-sm bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900"
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};