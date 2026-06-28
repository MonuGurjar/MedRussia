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

export const Header: React.FC<HeaderProps> = ({
  onToggleAdmin, onLogoClick, onLogout, onNavigate, onToggleCurrency,
  isAdmin, isAuthenticated, userName, userAvatar, theme, onToggleTheme
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleNav = (path: string) => {
    setShowDropdown(false);
    if (isAdmin) {
      navigate('/admin');
    } else {
      navigate('/user');
    }
  };

  return (
    <nav className="bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop h-16 flex items-center justify-between">
        {/* Logo */}
        <div onClick={() => { setShowDropdown(false); onLogoClick(); }} className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary font-bold text-lg transition-transform group-hover:scale-105">M</div>
          <div className="leading-tight hidden sm:block">
            <span className="text-headline-md text-primary block" style={{ fontSize: '18px', lineHeight: '24px' }}>MBBS Russia</span>
            <span className="text-label-sm text-on-surface-variant">Medical Admissions</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 relative">
          <button onClick={() => navigate('/compare')} className="hidden md:flex items-center gap-2 px-4 py-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg text-label-md font-medium transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>balance</span> Compare
          </button>
          <button onClick={() => navigate('/team')} className="hidden md:flex items-center gap-2 px-4 py-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg text-label-md font-medium transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group</span> Our Team
          </button>

          {onToggleCurrency && (
            <button onClick={onToggleCurrency} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors" title="Currency Converter">
              <span className="material-symbols-outlined">currency_exchange</span>
            </button>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-3 pl-2 pr-4 py-1.5 bg-surface-container-low border border-outline-variant rounded-full hover:bg-surface-container transition-all focus:outline-none focus:ring-2 focus:ring-primary/20">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-xs font-bold uppercase overflow-hidden">
                  {userAvatar ? <img src={userAvatar} alt="U" className="w-full h-full object-cover" /> : userName?.charAt(0) || 'U'}
                </div>
                <span className="text-label-md font-semibold text-on-surface hidden md:inline">{isAdmin ? 'Admin Panel' : 'My Hub'}</span>
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
                    {!isAdmin && (
                      <>
                        <button onClick={() => handleNav('profile')} className="w-full text-left px-4 py-2.5 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary rounded-lg flex items-center gap-3 transition-colors">
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span> Edit Profile
                        </button>
                        <button onClick={() => handleNav('documents')} className="w-full text-left px-4 py-2.5 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary rounded-lg flex items-center gap-3 transition-colors">
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>folder</span> My Vault
                        </button>
                        <button onClick={() => handleNav('settings')} className="w-full text-left px-4 py-2.5 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary rounded-lg flex items-center gap-3 transition-colors">
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</span> Settings
                        </button>
                      </>
                    )}
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
              <button onClick={() => navigate('/compare')} className="md:hidden flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-colors">
                <span className="material-symbols-outlined">balance</span>
              </button>
              <button onClick={onToggleAdmin} className="px-5 py-2 rounded-lg text-label-md font-semibold transition-all bg-secondary-container text-on-secondary-container hover:opacity-90">
                Apply Now
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
