import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import { UniversityCompare } from './components/UniversityCompare';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { ChatWidget } from './components/ChatWidget';
import { CurrencyConverter } from './components/CurrencyConverter';
import { SocialFab } from './components/SocialFab';
import { LegalModal, LegalPageType } from './components/LegalPages';
import { LandingPage } from './components/LandingPage';
import { TeamPage } from './components/TeamPage';
import { getAllFeedback, syncUsers } from './services/db';
import { getSettings, DEFAULT_SETTINGS } from './services/settings';
import { FeedbackEntry, User, AppSettings } from './types';

// Color Palettes for Dynamic Theming
const COLOR_PALETTES: Record<string, Record<number, string>> = {
  indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b' },
  blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
};

// Helper Component for WhatsApp Icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

// Protected Route Component
const ProtectedRoute = ({ children, role, user }: { children?: React.ReactNode, role?: 'admin' | 'student', user: User | null }) => {
  if (!user) return <Navigate to="/auth" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showCurrencyConverter, setShowCurrencyConverter] = useState(false);
  const [heroNeetScore, setHeroNeetScore] = useState('');

  const [isFabOpen, setIsFabOpen] = useState(false);
  const [activeLegalPage, setActiveLegalPage] = useState<LegalPageType | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  // Apply Theme & Dynamic Colors
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);

    if (settings?.themeConfig?.primaryColor) {
      const palette = COLOR_PALETTES[settings.themeConfig.primaryColor];
      if (palette) {
        Object.entries(palette).forEach(([shade, value]) => {
          root.style.setProperty(`--c-${shade}`, value);
        });
      }
    }
  }, [theme, settings?.themeConfig?.primaryColor]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [data, settingsData] = await Promise.all([
        getAllFeedback(),
        getSettings(),
        syncUsers()
      ]);
      setFeedbackList(data);
      setSettings(settingsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('mr_active_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }
    refreshData();
  }, []);

  const handleLoginSuccess = (user: User) => {
    localStorage.setItem('mr_active_user', JSON.stringify(user));
    setCurrentUser(user);
    if (user.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/user');
    }
    refreshData();
  };

  const handleLogout = () => {
    localStorage.removeItem('mr_active_user');
    setCurrentUser(null);
    navigate('/');
    refreshData();
  };

  const handleHeaderAction = () => {
    if (currentUser) {
      if (currentUser.role === 'admin') navigate('/admin');
      else navigate('/user');
    } else {
      navigate('/auth');
    }
  };

  const handleLogoClick = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEligibilityCheck = () => {
    if (!heroNeetScore) {
      alert("Please enter your NEET Score.");
      return;
    }
    localStorage.setItem('mr_neet_score', heroNeetScore);
    navigate('/auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const FAQ_DATA = [
    { q: "Is NEET qualification mandatory for MBBS in Russia?", a: "Yes, qualifying NEET is mandatory for Indian students to pursue MBBS abroad and appear for the NExT/FMGE exam in India." },
    { q: "What is the duration of the course?", a: "The course typically lasts 5.8 to 6 years, including a mandatory clinical rotation (internship) in Russia." },
    { q: "Is the degree valid in India?", a: "Yes, degrees from WHO and NMC-recognized Russian universities are valid in India. You must clear the NExT exam to practice." },
    { q: "What is the approximate cost?", a: "Tuition fees range from ₹18 Lakhs to ₹40 Lakhs for the entire 6-year course, depending on the university and city." },
    { q: "Is it safe for Indian students?", a: "Russia is generally safe for international students. Universities provide secure hostels with CCTV and warden supervision." },
    { q: "Can I work while studying?", a: "Students can work part-time, but it is recommended to focus on studies due to the rigorous medical curriculum." }
  ];

  const hideHeader = location.pathname.startsWith('/admin') || location.pathname.startsWith('/user');
  const isDashboardView = location.pathname.startsWith('/admin') || location.pathname.startsWith('/user');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 relative overflow-x-hidden">
      {!hideHeader && (
        <Header
          onToggleAdmin={handleHeaderAction}
          onLogoClick={handleLogoClick}
          onLogout={handleLogout}
          onNavigate={(view) => {
            if (view === 'compare') navigate('/compare');
            else navigate('/');
          }}
          onToggleCurrency={settings?.currencyConverter?.enabled ? () => setShowCurrencyConverter(!showCurrencyConverter) : undefined}
          isAdmin={currentUser?.role === 'admin'}
          isAuthenticated={!!currentUser}
          userName={currentUser?.name}
          userAvatar={currentUser?.avatar}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      <main className={isDashboardView ? "" : "max-w-7xl mx-auto px-4 py-8"}>
        <Routes>
          <Route path="/" element={
            <LandingPage
              settings={settings}
              heroNeetScore={heroNeetScore}
              setHeroNeetScore={setHeroNeetScore}
              handleEligibilityCheck={handleEligibilityCheck}
              handleSpecificNavigation={(v) => {
                if (v === 'compare') navigate('/compare');
              }}
              refreshData={refreshData}
              WhatsAppIcon={WhatsAppIcon}
              FAQ_DATA={FAQ_DATA}
            />
          } />

          <Route path="/auth" element={
            !currentUser ? (
              <Login
                onAuthSuccess={handleLoginSuccess}
                onCancel={() => navigate('/')}
                onShowLegal={(page) => setActiveLegalPage(page)}
              />
            ) : <Navigate to={currentUser.role === 'admin' ? '/admin' : '/user'} replace />
          } />

          <Route path="/compare" element={<UniversityCompare />} />
          <Route path="/team" element={<TeamPage />} />



          {/* Admin Dashboard - Protected */}
          <Route path="/admin" element={
            <ProtectedRoute role="admin" user={currentUser}>
              <AdminDashboard
                feedbackList={feedbackList}
                onRefresh={refreshData}
                onLogout={handleLogout}
                isLoading={isLoading}
                currentUser={currentUser!}
                theme={theme}
                toggleTheme={toggleTheme}
              />
            </ProtectedRoute>
          } />

          {/* User Dashboard - Protected */}
          <Route path="/user" element={
            <ProtectedRoute role="student" user={currentUser}>
              <UserDashboard
                user={currentUser!}
                onLogout={handleLogout}
                onInquirySubmitted={refreshData}
                onFabToggle={setIsFabOpen}
                theme={theme}
                toggleTheme={toggleTheme}
                onToggleCurrency={settings?.currencyConverter?.enabled ? () => setShowCurrencyConverter(!showCurrencyConverter) : undefined}
              />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!hideHeader && location.pathname !== '/auth' && (
        <footer className="mt-20 bg-slate-900 dark:bg-slate-950 text-white relative overflow-hidden transition-colors duration-300">
          {/* Gradient Accent Line */}
          <div className="h-1 footer-accent" />

          {/* Main Footer Content */}
          <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-14">

              {/* Column 1: Brand */}
              <div className="sm:col-span-2 lg:col-span-1 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-indigo-500 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/20 border-t border-l border-indigo-400/30">
                    MR
                  </div>
                  <div>
                    <span className="text-lg font-black tracking-tight block">MedRussia</span>
                    <span className="text-indigo-400 text-[9px] font-bold uppercase tracking-widest">MBBS Decision Platform</span>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed font-medium max-w-xs">
                  Trusted by 600+ Indian students for honest, transparent guidance on MBBS admissions in Russia. Zero hidden fees, real mentorship.
                </p>
                {/* Social Icons */}
                <div className="flex items-center gap-3 pt-1">
                  <a href="https://youtube.com/@amit_gurjar-w1" target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-400/30 flex items-center justify-center text-slate-400 hover:text-red-400 transition-all duration-200 hover:scale-110"
                    title="YouTube">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>
                  <a href="https://www.instagram.com/med_vlog716/" target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-400/30 flex items-center justify-center text-slate-400 hover:text-pink-400 transition-all duration-200 hover:scale-110"
                    title="Instagram">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                  <a href="https://wa.me/917375017401" target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-400/30 flex items-center justify-center text-slate-400 hover:text-emerald-400 transition-all duration-200 hover:scale-110"
                    title="WhatsApp">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Column 2: Quick Links */}
              <div className="space-y-5">
                <h4 className="text-xs font-black uppercase tracking-widest text-white/60">Quick Links</h4>
                <ul className="space-y-3">
                  {[
                    { label: 'Home', action: () => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
                    { label: 'Compare Universities', action: () => navigate('/compare') },
                    { label: 'Get Counseling', action: () => { const el = document.getElementById('feedback-form'); if (el) el.scrollIntoView({ behavior: 'smooth' }); else navigate('/'); } },
                    { label: 'Sign In / Register', action: () => navigate('/auth') },
                    { label: 'Our Team', action: () => navigate('/team') },
                  ].map((item) => (
                    <li key={item.label}>
                      <button
                        onClick={item.action}
                        className="text-slate-400 hover:text-white text-sm font-medium transition-colors duration-200 flex items-center gap-2 group"
                      >
                        <span className="w-1 h-1 rounded-full bg-indigo-500/50 group-hover:bg-indigo-400 transition-colors" />
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 3: Resources */}
              <div className="space-y-5">
                <h4 className="text-xs font-black uppercase tracking-widest text-white/60">Resources</h4>
                <ul className="space-y-3">
                  {[
                    { label: 'FAQ', action: () => { navigate('/'); setTimeout(() => { const el = document.querySelector('[class*="Frequently"]'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 300); } },
                    { label: 'Privacy Policy', action: () => setActiveLegalPage('privacy') },
                    { label: 'Terms of Service', action: () => setActiveLegalPage('terms') },
                    { label: 'Disclaimer', action: () => setActiveLegalPage('disclaimer') },
                  ].map((item) => (
                    <li key={item.label}>
                      <button
                        onClick={item.action}
                        className="text-slate-400 hover:text-white text-sm font-medium transition-colors duration-200 flex items-center gap-2 group"
                      >
                        <span className="w-1 h-1 rounded-full bg-indigo-500/50 group-hover:bg-indigo-400 transition-colors" />
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 4: Connect */}
              <div className="space-y-5">
                <h4 className="text-xs font-black uppercase tracking-widest text-white/60">Connect</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5">
                    <span className="text-base mt-0.5">📱</span>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">WhatsApp</p>
                      <a href="https://wa.me/917375017401" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-300 hover:text-emerald-400 font-medium transition-colors">+91 73750 17401</a>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-base mt-0.5">📧</span>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Email</p>
                      <a href="mailto:support@medrussia.in" className="text-sm text-slate-300 hover:text-indigo-400 font-medium transition-colors">support@medrussia.in</a>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-base mt-0.5">🌍</span>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Offices</p>
                      <p className="text-sm text-slate-400 font-medium">India · Russia</p>
                    </div>
                  </li>
                </ul>
              </div>

            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-slate-500 text-xs font-medium text-center sm:text-left">
                © {new Date().getFullYear()} MedRussia Channel Hub. Empowering Future Doctors.
                <span className="mx-1.5">·</span>
                Made with <span className="text-rose-400">❤</span> in Russia & India
              </p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-400/30 flex items-center justify-center text-slate-500 hover:text-indigo-400 transition-all hover:scale-110"
                title="Back to top"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Floating WhatsApp FAB - Only on Public Pages */}
      {!isDashboardView && location.pathname === '/' && settings?.features?.whatsappFab && (
        <SocialFab onToggle={setIsFabOpen} />
      )}

      {/* Currency Converter Modal (Triggered by Header) */}
      {showCurrencyConverter && settings?.currencyConverter.enabled && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCurrencyConverter(false)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white dark:bg-slate-700 text-slate-500 dark:text-white rounded-full flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-transform"
            >
              ✕
            </button>
            <CurrencyConverter apiKey={settings.currencyConverter.apiKey} />
          </div>
        </div>
      )}

      {/* AI Chat Widget */}
      {settings?.features?.chatWidget && (
        <ChatWidget isLifted={isFabOpen} />
      )}

      {/* Legal Modal Overlay */}
      {activeLegalPage && (
        <LegalModal page={activeLegalPage} onClose={() => setActiveLegalPage(null)} />
      )}
    </div>
  );
};



export default App;