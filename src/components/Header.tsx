import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onLogoClick: () => void;
  onLogout: () => void;
  onNavigate?: (view: string) => void;
  onToggleCurrency?: () => void;
  isAuthenticated: boolean;
  userName?: string;
  userUsername?: string;
  userAvatar?: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLogoClick, onLogout, onNavigate, onToggleCurrency,
  isAuthenticated, userName, userUsername, userAvatar, theme, onToggleTheme
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleNav = (path: string) => {
    setShowDropdown(false);
    const dest = userUsername ? `/@${userUsername}` : '/user';
    if (path && path !== 'dashboard' && path !== 'inquiries') {
      navigate(`${dest}/${path}`);
    } else {
      navigate(dest);
    }
  };

  return (
    <nav className="bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-50 backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 md:px-12 h-16 flex items-center justify-between">
        {/* Logo */}
        <div onClick={() => { setShowDropdown(false); onLogoClick(); }} className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary font-bold text-base sm:text-lg transition-transform group-hover:scale-105 shadow-sm">M</div>
          <div className="leading-tight">
            <span className="text-headline-md text-primary font-extrabold block text-base sm:text-lg" style={{ lineHeight: '22px' }}>MedRussia</span>
            <span className="text-[10px] sm:text-label-sm text-on-surface-variant font-medium block">Medical Admissions</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-1 sm:gap-2 relative">
          <button onClick={() => navigate('/explorer')} className="flex items-center gap-1 px-2.5 py-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg text-xs sm:text-label-md font-bold transition-colors">
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">travel_explore</span> <span className="hidden sm:inline">Explorer</span>
          </button>
          <button onClick={() => navigate('/calculator')} className="flex items-center gap-1 px-2.5 py-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg text-xs sm:text-label-md font-bold transition-colors">
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">calculate</span> <span className="hidden sm:inline">Calculator</span>
          </button>

          {isAuthenticated ? (
            <>
              <button onClick={() => navigate('/apply')} className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs sm:text-label-md font-extrabold transition-colors">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-amber-600">edit_document</span> <span>Apply</span>
              </button>
              <button onClick={() => navigate('/tracker')} className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg text-xs sm:text-label-md font-bold transition-colors">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-emerald-600">timeline</span> <span>Tracker</span>
              </button>
              <button onClick={() => navigate('/ai-counselor')} className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg text-xs sm:text-label-md font-bold transition-colors">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-blue-600">smart_toy</span> <span>AI MD</span>
              </button>
              <button onClick={() => navigate('/counselor')} className="flex items-center gap-1 px-2.5 py-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg text-xs sm:text-label-md font-bold transition-colors">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-amber-500">support_agent</span> Desk
              </button>

              {onToggleCurrency && (
                <button onClick={onToggleCurrency} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors" title="Currency Converter">
                  <span className="material-symbols-outlined text-[20px] sm:text-[24px]">currency_exchange</span>
                </button>
              )}

              <div className="flex items-center gap-3">
                <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-3 pl-2 pr-4 py-1.5 bg-surface-container-low border border-outline-variant rounded-full hover:bg-surface-container transition-all focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-xs font-bold uppercase overflow-hidden">
                    {userAvatar ? <img src={userAvatar} alt="U" className="w-full h-full object-cover" /> : userName?.charAt(0) || 'U'}
                  </div>
                  <span className="text-label-md font-semibold text-on-surface hidden md:inline">My Hub</span>
                  <span className={`text-xs text-outline transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {showDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant py-2 fade-in-up z-50">
                    <div className="px-4 py-3 border-b border-outline-variant mb-2">
                      <p className="text-label-sm text-outline">Logged in as</p>
                      <p className="text-label-md font-semibold text-on-surface truncate">{userName}</p>
                    </div>
                    <div className="space-y-1 px-1">
                      <button onClick={() => handleNav('inquiries')} className="w-full text-left px-4 py-2.5 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary rounded-lg flex items-center gap-3 transition-colors">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dashboard</span> Dashboard
                      </button>
                      <button onClick={() => { setShowDropdown(false); navigate('/compare'); }} className="w-full text-left px-4 py-2.5 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary rounded-lg flex items-center gap-3 transition-colors md:hidden">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>balance</span> Compare Unis
                      </button>
                      <button onClick={() => handleNav('profile')} className="w-full text-left px-4 py-2.5 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-[#f59e0b] rounded-lg flex items-center gap-3 transition-colors">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span> Edit Profile
                      </button>
                      <button onClick={() => handleNav('documents')} className="w-full text-left px-4 py-2.5 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-[#f59e0b] rounded-lg flex items-center gap-3 transition-colors">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>folder</span> My Vault
                      </button>
                      <button onClick={() => handleNav('settings')} className="w-full text-left px-4 py-2.5 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-[#f59e0b] rounded-lg flex items-center gap-3 transition-colors">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</span> Settings
                      </button>
                    </div>
                    <div className="border-t border-outline-variant mt-2 pt-2 px-1">
                      <button onClick={() => { setShowDropdown(false); onLogout(); }} className="w-full text-left px-4 py-2.5 text-label-md font-semibold text-error hover:bg-error-container rounded-lg flex items-center gap-3 transition-colors">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button onClick={() => navigate('/auth')} className="px-3.5 py-2 sm:px-5 sm:py-2 rounded-lg text-xs sm:text-label-md font-bold transition-all bg-primary text-on-primary hover:opacity-95 shadow-sm flex items-center gap-1.5 ml-1 sm:ml-2">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">login</span> Sign In / Sign Up
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
