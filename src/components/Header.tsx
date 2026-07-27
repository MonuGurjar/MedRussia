import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onLogoClick: () => void;
  onLogout: () => void;
  onNavigate?: (view: string) => void;
  onToggleCurrency?: () => void;
  isAuthenticated: boolean;
  userName?: string;
  userAvatar?: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLogoClick, onLogout, onNavigate, onToggleCurrency,
  isAuthenticated, userName, userAvatar, theme, onToggleTheme
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleNav = (path: string) => {
    setShowDropdown(false);
    navigate('/user');
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

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 relative">
          <button onClick={() => navigate('/compare')} className="hidden md:flex items-center gap-2 px-4 py-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg text-label-md font-medium transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>balance</span> Compare
          </button>
          <button onClick={() => navigate('/team')} className="hidden md:flex items-center gap-2 px-4 py-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg text-label-md font-medium transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group</span> Our Team
          </button>

          {onToggleCurrency && (
            <button onClick={onToggleCurrency} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors" title="Currency Converter">
              <span className="material-symbols-outlined text-[20px] sm:text-[24px]">currency_exchange</span>
            </button>
          )}

          {isAuthenticated ? (
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
          ) : (
            <>
              <button onClick={() => navigate('/team')} className="md:hidden flex items-center justify-center w-9 h-9 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-colors" title="Our Team">
                <span className="material-symbols-outlined text-[20px]">group</span>
              </button>
              <button onClick={() => navigate('/compare')} className="md:hidden flex items-center justify-center w-9 h-9 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-colors" title="Compare Universities">
                <span className="material-symbols-outlined text-[20px]">balance</span>
              </button>
              <button onClick={() => navigate('/auth')} className="px-3.5 py-2 sm:px-5 sm:py-2 rounded-lg text-xs sm:text-label-md font-bold transition-all bg-secondary-container text-on-secondary-container hover:opacity-90 shadow-sm">
                Apply Now
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
