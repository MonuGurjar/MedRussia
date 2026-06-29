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
import { LegalModal, LegalPageType, LegalPage } from './components/LegalPages';
import { UniversitiesList } from './components/UniversitiesList';
import { UniversityDetails } from './components/UniversityDetails';
import { LandingPage } from './components/LandingPage';
import { TeamPage } from './components/TeamPage';
import { getAllFeedback, syncUsers, getAllAdmins } from './services/db';
import { getSettings, DEFAULT_SETTINGS } from './services/settings';
import { FeedbackEntry, User, AppSettings } from './types';
import { supabase } from './lib/supabase';

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
  if (role && user.role !== role) return <Navigate to="/" replace />;
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

  useEffect(() => {
    refreshData();

    // Initialize Supabase Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        try {
          const res = await fetch(`/api/users?id=${session.user.id}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          if (res.ok) {
            let profile = await res.json();
            
            const admins = await getAllAdmins();
            const isAdminInUpstash = admins.some(a => a.email === profile.email);
            
            // Auto-elevate to admin if email matches VITE_ADMIN_EMAIL or is in Upstash
            const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
            if ((isAdminInUpstash || (adminEmail && profile.email === adminEmail)) && profile.role !== 'admin') {
              profile = { ...profile, role: 'admin' };
              await fetch('/api/users', { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, 
                body: JSON.stringify(profile) 
              });
            }

            setCurrentUser(profile);
            localStorage.setItem('mr_active_user', JSON.stringify(profile));
          } else if (event === 'SIGNED_IN') {
            // New user from OAuth
            const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
            const admins = await getAllAdmins();
            const isAdminInUpstash = admins.some(a => a.email === session.user.email);
            const isAutoAdmin = isAdminInUpstash || (adminEmail && session.user.email === adminEmail);
            
            const newUser: User = {
              id: session.user.id,
              email: session.user.email || '',
              role: isAutoAdmin ? 'admin' : 'student',
              name: session.user.user_metadata?.full_name || 'New User',
              shortlistedUniversities: [],
              documents: {},
              notifications: [],
            };
            await fetch('/api/users', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify(newUser)
            });
            setCurrentUser(newUser);
          }
        } catch (e) {
          console.error('Error fetching user profile', e);
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') navigate('/admin', { replace: true });
    else navigate('/user', { replace: true });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    navigate('/');
  };

  const handleHeaderAction = () => {
    if (currentUser) navigate(currentUser.role === 'admin' ? '/admin' : '/user');
    else navigate('/auth');
  };

  const handleLogoClick = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEligibilityCheck = () => {
    if (!heroNeetScore) { alert("Please enter your NEET Score."); return; }
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
  const isDashboardView = hideHeader;

  return (
    <div className="min-h-screen bg-background text-on-background relative overflow-x-hidden">
      {!hideHeader && (
        <Header
          onToggleAdmin={handleHeaderAction}
          onLogoClick={handleLogoClick}
          onLogout={handleLogout}
          onNavigate={(view) => { if (view === 'compare') navigate('/compare'); else navigate('/'); }}
          onToggleCurrency={settings?.currencyConverter?.enabled ? () => setShowCurrencyConverter(!showCurrencyConverter) : undefined}
          isAdmin={currentUser?.role === 'admin'}
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
            />
          } />

          <Route path="/universities" element={<UniversitiesList />} />
          <Route path="/university/:id" element={<UniversityDetails />} />

          <Route path="/auth" element={
            isAuthLoading ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="text-on-surface-variant font-medium animate-pulse">Authenticating...</p>
              </div>
            ) : !currentUser ? (
              <Login onAuthSuccess={handleLoginSuccess} onCancel={() => navigate('/')} onShowLegal={(page) => setActiveLegalPage(page)} />
            ) : <Navigate to={currentUser.role === 'admin' ? '/admin' : '/user'} replace />
          } />

          <Route path="/compare" element={<UniversityCompare />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/privacy" element={<LegalPage page="privacy" />} />
          <Route path="/terms" element={<LegalPage page="terms" />} />
          <Route path="/disclaimer" element={<LegalPage page="disclaimer" />} />

          <Route path="/admin" element={
            <ProtectedRoute role="admin" user={currentUser} isLoading={isAuthLoading}>
              <AdminDashboard feedbackList={feedbackList} onRefresh={refreshData} onLogout={handleLogout} isLoading={isLoading} currentUser={currentUser!} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          } />

          <Route path="/user" element={
            <ProtectedRoute role="student" user={currentUser} isLoading={isAuthLoading}>
              <UserDashboard user={currentUser!} onLogout={handleLogout} onInquirySubmitted={refreshData} onFabToggle={setIsFabOpen} theme={theme} toggleTheme={toggleTheme} onToggleCurrency={settings?.currencyConverter?.enabled ? () => setShowCurrencyConverter(!showCurrencyConverter) : undefined} />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      {!hideHeader && location.pathname !== '/auth' && (
        <footer className="mt-20 bg-tertiary text-on-tertiary relative overflow-hidden">
          <div className="h-1 footer-accent" />
          <div className="max-w-container-max mx-auto px-6 pt-16 pb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-14">
              <div className="sm:col-span-2 lg:col-span-1 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center text-on-primary font-bold text-lg">MG</div>
                  <div>
                    <span className="text-lg font-bold tracking-tight block text-white">MBBS Russia</span>
                    <span className="text-on-primary-container text-xs font-semibold">Medical Admissions</span>
                  </div>
                </div>
                <p className="text-on-tertiary-container text-sm leading-relaxed max-w-xs">Trusted by 600+ Indian students for honest, transparent guidance on MBBS admissions in Russia.</p>
              </div>
              <div className="space-y-5">
                <h4 className="text-label-sm text-on-tertiary-container uppercase tracking-widest">Quick Links</h4>
                <ul className="space-y-3">
                  {[{ label: 'Home', action: () => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, { label: 'Compare Universities', action: () => navigate('/compare') }, { label: 'Sign In / Register', action: () => navigate('/auth') }, { label: 'Our Team', action: () => navigate('/team') }].map(i => (
                    <li key={i.label}><button onClick={i.action} className="text-on-tertiary-container hover:text-white text-sm font-medium transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary-fixed-dim" />{i.label}</button></li>
                  ))}
                </ul>
              </div>
              <div className="space-y-5">
                <h4 className="text-label-sm text-on-tertiary-container uppercase tracking-widest">Resources</h4>
                <ul className="space-y-3">
                  {[{ label: 'Privacy Policy', action: () => { navigate('/privacy'); window.scrollTo(0,0); } }, { label: 'Terms of Service', action: () => { navigate('/terms'); window.scrollTo(0,0); } }, { label: 'Disclaimer', action: () => { navigate('/disclaimer'); window.scrollTo(0,0); } }].map(i => (
                    <li key={i.label}><button onClick={i.action} className="text-on-tertiary-container hover:text-white text-sm font-medium transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary-fixed-dim" />{i.label}</button></li>
                  ))}
                </ul>
              </div>
              <div className="space-y-5">
                <h4 className="text-label-sm text-on-tertiary-container uppercase tracking-widest">Connect</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5"><span className="material-symbols-outlined text-primary-fixed-dim" style={{fontSize:'20px'}}>phone_iphone</span><div><p className="text-label-sm text-on-tertiary-container">WhatsApp</p><a href="https://wa.me/917375017401" target="_blank" rel="noopener noreferrer" className="text-sm text-white hover:text-primary-fixed-dim font-medium transition-colors">+91 73750 17401</a></div></li>
                  <li className="flex items-start gap-2.5"><span className="material-symbols-outlined text-primary-fixed-dim" style={{fontSize:'20px'}}>mail</span><div><p className="text-label-sm text-on-tertiary-container">Email</p><a href="mailto:support@medrussia.in" className="text-sm text-white hover:text-primary-fixed-dim font-medium transition-colors">support@medrussia.in</a></div></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5">
            <div className="max-w-container-max mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-on-tertiary-container text-xs font-medium">© {new Date().getFullYear()} MBBS Russia. Made with ❤ in Russia & India</p>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-primary/20 border border-white/10 flex items-center justify-center text-on-tertiary-container hover:text-white transition-all">
                <span className="material-symbols-outlined" style={{fontSize:'18px'}}>keyboard_arrow_up</span>
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
    </div>
  );
};

export default App;
