import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { UserDashboard } from './components/UserDashboard';
import { UniversityCompare } from './components/UniversityCompare';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { ChatWidget } from './components/ChatWidget';
import { CurrencyConverter } from './components/CurrencyConverter';
import { SocialFab } from './components/SocialFab';
import { LegalModal, LegalPageType, LegalPage } from './components/LegalPages';
import { UniversitiesList } from './components/UniversitiesList';
import { UniversityDetails } from './components/UniversityDetails';
import { LandingPage } from './components/LandingPage';
import { TeamPage } from './components/TeamPage';
import { EligibilityModal } from './components/EligibilityModal';
import { UniversityExplorer } from './components/UniversityExplorer';
import { MbbsBudgetCalculator } from './components/MbbsBudgetCalculator';
import { AiEligibilityChecker } from './components/AiEligibilityChecker';
import { HumanCounselorDesk } from './components/HumanCounselorDesk';
import { getAllFeedback, syncUsers } from './services/db';
import { getSettings, DEFAULT_SETTINGS } from './services/settings';
import { FeedbackEntry, User, AppSettings } from './types';
import { supabase } from './lib/supabase';

const isAdminRole = (role?: string) => ['admin', 'super_admin', 'manager', 'staff'].includes(role || '');

const ProtectedRoute = ({ children, role, user, isLoading }: { children?: React.ReactNode, role?: 'admin' | 'student', user: User | null, isLoading?: boolean }) => {
  if (isLoading) return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <div className="hidden md:block w-64 bg-white border-r border-slate-200 shrink-0 p-6 space-y-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-slate-200 rounded animate-pulse"></div>
          <div className="space-y-1.5">
            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-2 w-16 bg-slate-100 rounded animate-pulse"></div>
          </div>
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-5 h-5 bg-slate-200 rounded animate-pulse"></div>
            <div className={`h-3 bg-slate-200 rounded animate-pulse`} style={{width: `${60 + Math.random() * 40}%`}}></div>
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="space-y-2">
            <div className="h-5 w-48 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-3 w-32 bg-slate-100 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse"></div>
            <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="flex-1 p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse"></div>
                <div className="h-8 w-32 bg-slate-200 rounded animate-pulse"></div>
                <div className="h-2 w-full bg-slate-100 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded animate-pulse" style={{width: `${40 + Math.random() * 30}%`}}></div>
                  <div className="h-2 bg-slate-100 rounded animate-pulse" style={{width: `${60 + Math.random() * 30}%`}}></div>
                </div>
                <div className="w-16 h-6 bg-slate-100 rounded-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showCurrencyConverter, setShowCurrencyConverter] = useState(false);
  const [heroNeetScore, setHeroNeetScore] = useState('');
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [activeLegalPage, setActiveLegalPage] = useState<LegalPageType | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [data, settingsData] = await Promise.all([getAllFeedback(), getSettings(), syncUsers()]);
      setFeedbackList(data);
      setSettings(settingsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSession = async (session: any): Promise<User | null> => {
    try {
      const role = session.user.app_metadata?.role || session.user.user_metadata?.role || 'student';
      
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        const localUsers = getLocal<User>('mr_users');
        const localUser = localUsers.find((u: any) => u.id === profile.id);
        const docs = (profile.documents && Object.keys(profile.documents).length > 0) 
          ? profile.documents 
          : (localUser?.documents || {});

        const mappedUser: User = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          username: profile.username || session.user.user_metadata?.username || localUser?.username,
          phone: profile.phone || localUser?.phone,
          neetScore: profile.neet_score || localUser?.neetScore,
          budget: profile.budget || localUser?.budget,
          shortlistedUniversities: profile.shortlisted_universities || localUser?.shortlistedUniversities || [],
          documents: docs,
          notifications: profile.notifications || localUser?.notifications || [],
          eligibilityData: profile.eligibility_data || localUser?.eligibilityData,
          eligibilityResult: profile.eligibility_result || localUser?.eligibilityResult,
          role
        };
        setCurrentUser(mappedUser);
        localStorage.setItem('mr_current_user', JSON.stringify(mappedUser));
        return mappedUser;
      } else {
        const localUsers = getLocal<User>('mr_users');
        const localUser = localUsers.find((u: any) => u.id === session.user.id);

        const newUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          role,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User',
          username: session.user.user_metadata?.username || localUser?.username,
          phone: session.user.user_metadata?.phone || '',
          shortlistedUniversities: localUser?.shortlistedUniversities || [],
          documents: localUser?.documents || {},
          notifications: localUser?.notifications || [],
          eligibilityData: localUser?.eligibilityData,
          eligibilityResult: localUser?.eligibilityResult
        };
        await supabase.from('users').upsert({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          username: newUser.username,
          phone: newUser.phone,
          documents: newUser.documents
        });
        setCurrentUser(newUser);
        localStorage.setItem('mr_current_user', JSON.stringify(newUser));
        return newUser;
      }
    } catch (e) {
      console.error('Error fetching user profile', e);
      return null;
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    refreshData();

    let isMounted = true;

    const processSession = async (session: any) => {
      let activeUser: User | null = null;
      if (session) {
        activeUser = await handleSession(session);
      }

      if (!activeUser) {
        const saved = localStorage.getItem('mr_current_user');
        if (saved) {
          try {
            activeUser = JSON.parse(saved);
          } catch (e) {}
        }
      }

      if (isMounted) {
        if (activeUser) {
          setCurrentUser(activeUser);
          localStorage.setItem('mr_current_user', JSON.stringify(activeUser));
        }
        setIsAuthLoading(false);
      }
    };

    // 1. Check initial session on mount (fixes refresh logout issues)
    supabase.auth.getSession().then(({ data: { session } }) => {
      processSession(session);
    });

    // 2. Listen for future auth changes (login/logout/token refresh/initial session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        await processSession(session);
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          localStorage.removeItem('mr_current_user');
          setCurrentUser(null);
          setIsAuthLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('mr_current_user', JSON.stringify(user));
    navigate('/user', { replace: true });
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) {}
    localStorage.removeItem('mr_current_user');
    setCurrentUser(null);
    navigate('/');
  };

  const handleHeaderAction = () => {
    if (currentUser) navigate('/user');
    else navigate('/auth');
  };

  const handleLogoClick = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [isEligibilityModalOpen, setIsEligibilityModalOpen] = useState(false);

  const handleEligibilityCheck = () => {
    setIsEligibilityModalOpen(true);
  };

  const FAQ_DATA = [
    { q: "Is NEET qualification mandatory for MBBS in Russia?", a: "Yes, qualifying NEET is mandatory for Indian students to pursue MBBS abroad and appear for the NExT/FMGE exam in India." },
    { q: "What is the duration of the course?", a: "The course typically lasts 5.8 to 6 years, including a mandatory clinical rotation (internship) in Russia." },
    { q: "Is the degree valid in India?", a: "Yes, degrees from WHO and NMC-recognized Russian universities are valid in India. You must clear the NExT exam to practice." },
    { q: "What is the approximate cost?", a: "Tuition fees range from ₹18 Lakhs to ₹40 Lakhs for the entire 6-year course, depending on the university and city." },
    { q: "Is it safe for Indian students?", a: "Russia is generally safe for international students. Universities provide secure hostels with CCTV and warden supervision." },
    { q: "Can I work while studying?", a: "Students can work part-time, but it is recommended to focus on studies due to the rigorous medical curriculum." }
  ];

  const hideHeader = location.pathname.startsWith('/admin') || location.pathname.startsWith('/user') || location.pathname === '/auth';
  const isDashboardView = location.pathname.startsWith('/admin') || location.pathname.startsWith('/user');

  return (
    <div className="min-h-screen bg-background text-on-background relative overflow-x-hidden">
      {!hideHeader && (
        <Header
          onLogoClick={handleLogoClick}
          onLogout={handleLogout}
          onNavigate={(view) => { if (view === 'compare') navigate('/compare'); else navigate('/'); }}
          onToggleCurrency={settings?.currencyConverter?.enabled ? () => setShowCurrencyConverter(!showCurrencyConverter) : undefined}
          isAuthenticated={!!currentUser}
          userName={currentUser?.name}
          userAvatar={currentUser?.avatar}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      <main className={isDashboardView ? "" : ""}>
        <Routes>
          <Route path="/" element={
            <LandingPage
              settings={settings}
              heroNeetScore={heroNeetScore}
              setHeroNeetScore={setHeroNeetScore}
              handleEligibilityCheck={handleEligibilityCheck}
              handleSpecificNavigation={(v) => { if (v === 'compare') navigate('/compare'); }}
              refreshData={refreshData}
              FAQ_DATA={FAQ_DATA}
              currentUser={currentUser}
              onToggleCurrency={settings?.currencyConverter?.enabled ? () => setShowCurrencyConverter(!showCurrencyConverter) : undefined}
            />
          } />

          <Route path="/universities" element={<UniversitiesList />} />
          <Route path="/university/:id" element={<UniversityDetails />} />
          <Route path="/explorer" element={<UniversityExplorer onApplyClick={() => navigate('/auth')} />} />
          <Route path="/calculator" element={<MbbsBudgetCalculator onApplyWithBudget={() => navigate('/auth')} />} />
          <Route path="/eligibility" element={<AiEligibilityChecker />} />
          <Route path="/counselor" element={<HumanCounselorDesk />} />

          <Route path="/auth" element={
            isAuthLoading ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="text-on-surface-variant font-medium animate-pulse">Authenticating...</p>
              </div>
            ) : !currentUser ? (
              <Login onAuthSuccess={handleLoginSuccess} onCancel={() => navigate('/')} onShowLegal={(page) => setActiveLegalPage(page)} />
            ) : <Navigate to="/user" replace />
          } />

          <Route path="/compare" element={<UniversityCompare />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/privacy" element={<LegalPage page="privacy" />} />
          <Route path="/terms" element={<LegalPage page="terms" />} />
          <Route path="/disclaimer" element={<LegalPage page="disclaimer" />} />

          <Route path="/admin" element={<Navigate to="/user" replace />} />

          <Route path="/user" element={
            <ProtectedRoute role="student" user={currentUser} isLoading={isAuthLoading}>
              {currentUser ? (
                <UserDashboard user={currentUser} onLogout={handleLogout} onInquirySubmitted={refreshData} onFabToggle={setIsFabOpen} theme={theme} toggleTheme={toggleTheme} onToggleCurrency={settings?.currencyConverter?.enabled ? () => setShowCurrencyConverter(!showCurrencyConverter) : undefined} />
              ) : null}
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      {!hideHeader && location.pathname !== '/auth' && (
        <footer className="mt-12 md:mt-16 bg-slate-950 text-slate-200 relative overflow-hidden border-t border-slate-800/80">
          <div className="h-1 bg-gradient-to-r from-amber-500 via-primary to-amber-500" />
          
          <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 pt-8 md:pt-12 pb-20 md:pb-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
              
              {/* Column 1: About (col-span-1 md:col-span-4) */}
              <div className="md:col-span-4 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#1a365d] rounded-xl flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-md border border-white/10">M</div>
                  <div>
                    <span className="text-lg sm:text-xl font-extrabold tracking-tight block text-white">MedRussia</span>
                    <span className="text-amber-400 text-[11px] sm:text-xs font-semibold tracking-wide">Medical Admissions</span>
                  </div>
                </div>
                <p className="text-slate-300/85 text-xs sm:text-sm leading-relaxed max-w-sm font-medium">
                  Trusted by 600+ Indian students for honest, transparent guidance on MBBS admissions in Russia.
                </p>
              </div>

              {/* Column 2 & 3: Quick Links (Left) & Resources (Right) side-by-side on mobile */}
              <div className="md:col-span-5 grid grid-cols-2 gap-3.5 sm:gap-6">
                {/* Quick Links */}
                <div className="space-y-2.5 sm:space-y-3.5">
                  <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-widest">QUICK LINKS</h4>
                  <div className="space-y-1.5 sm:space-y-2">
                    {[
                      { label: 'Home', action: () => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
                      { label: 'Compare Unis', action: () => navigate('/compare') },
                      { label: 'Sign In / Register', action: () => navigate('/auth') },
                      { label: 'Our Team', action: () => navigate('/team') }
                    ].map(i => (
                      <button
                        key={i.label}
                        onClick={i.action}
                        className="w-full h-9 sm:h-11 px-2.5 sm:px-3.5 rounded-lg sm:rounded-[10px] bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 hover:text-white text-[11px] sm:text-xs font-semibold flex items-center justify-between border border-slate-800 hover:border-slate-700/80 transition-all duration-200 hover:-translate-y-[2px] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        <span className="truncate">{i.label}</span>
                        <span className="material-symbols-outlined text-[14px] text-slate-500 hidden sm:inline transition-transform duration-200 group-hover:translate-x-0.5">chevron_right</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resources */}
                <div className="space-y-2.5 sm:space-y-3.5">
                  <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-widest">RESOURCES</h4>
                  <div className="space-y-1.5 sm:space-y-2">
                    {[
                      { label: 'Privacy Policy', action: () => { navigate('/privacy'); window.scrollTo(0,0); } },
                      { label: 'Terms of Service', action: () => { navigate('/terms'); window.scrollTo(0,0); } },
                      { label: 'Disclaimer', action: () => { navigate('/disclaimer'); window.scrollTo(0,0); } }
                    ].map(i => (
                      <button
                        key={i.label}
                        onClick={i.action}
                        className="w-full h-9 sm:h-11 px-2.5 sm:px-3.5 rounded-lg sm:rounded-[10px] bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 hover:text-white text-[11px] sm:text-xs font-semibold flex items-center justify-between border border-slate-800 hover:border-slate-700/80 transition-all duration-200 hover:-translate-y-[2px] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        <span className="truncate">{i.label}</span>
                        <span className="material-symbols-outlined text-[14px] text-slate-500 hidden sm:inline transition-transform duration-200 group-hover:translate-x-0.5">chevron_right</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Column 4: Contact / Connect (col-span-1 md:col-span-3) */}
              <div className="md:col-span-3 space-y-2.5 sm:space-y-3.5">
                <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-widest">CONNECT</h4>
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                  <a
                    href="https://wa.me/917375017401"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Contact on WhatsApp"
                    className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <span className="material-symbols-outlined text-[16px] sm:text-[20px]">chat</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] sm:text-[10px] text-emerald-400 font-bold uppercase tracking-wider">WhatsApp</p>
                      <p className="text-[11px] sm:text-xs font-bold text-white truncate">+91 73750 17401</p>
                    </div>
                  </a>

                  <a
                    href="mailto:support@medrussia.in"
                    aria-label="Send email to support"
                    className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:bg-slate-800/90 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                      <span className="material-symbols-outlined text-[16px] sm:text-[20px]">mail</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email</p>
                      <p className="text-[11px] sm:text-xs font-bold text-white truncate">support@medrussia.in</p>
                    </div>
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* Copyright & Back to Top */}
          <div className="border-t border-slate-800/80 bg-slate-950/80">
            <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 py-4 flex flex-row justify-between items-center gap-4">
              <p className="text-slate-400 text-xs font-medium">
                © {new Date().getFullYear()} MedRussia. Made with ❤ in Russia & India
              </p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Back to top"
                className="w-10 h-10 rounded-full bg-slate-900 hover:bg-amber-500 text-slate-300 hover:text-slate-950 border border-slate-800 hover:border-amber-400 flex items-center justify-center transition-all duration-200 hover:-translate-y-1 shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500/50 shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">keyboard_arrow_up</span>
              </button>
            </div>
          </div>
        </footer>
      )}

      {!isDashboardView && location.pathname === '/' && settings?.features?.whatsappFab && <SocialFab onToggle={setIsFabOpen} />}

      {showCurrencyConverter && settings?.currencyConverter.enabled && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 fade-in-up">
          <div className="relative w-full max-w-sm">
            <button onClick={() => setShowCurrencyConverter(false)} className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-surface-container-lowest text-on-surface rounded-full flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-transform">✕</button>
            <CurrencyConverter apiKey={settings.currencyConverter.apiKey} />
          </div>
        </div>
      )}

      {settings?.features?.chatWidget && <ChatWidget isLifted={isFabOpen} />}
      {activeLegalPage && <LegalModal page={activeLegalPage} onClose={() => setActiveLegalPage(null)} />}
      
      <EligibilityModal
        isOpen={isEligibilityModalOpen}
        onClose={() => setIsEligibilityModalOpen(false)}
        isAuthenticated={!!currentUser}
        onLoginRedirect={(score, category, pcb) => {
          setIsEligibilityModalOpen(false);
          navigate('/auth');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
};

export default App;
