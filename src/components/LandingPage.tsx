import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeedbackForm } from './FeedbackForm';
import { MbbsBudgetCalculator } from './MbbsBudgetCalculator';
import { AiEligibilityChecker } from './AiEligibilityChecker';
import { AppSettings, User } from '../types';
import { DETAILED_UNIVERSITIES } from '../constants/universities';
import heroImg from '../assets/landing_hero_medical_students.png';

interface LandingPageProps {
  settings: AppSettings;
  heroNeetScore: string;
  setHeroNeetScore: (val: string) => void;
  handleEligibilityCheck: () => void;
  handleSpecificNavigation: (v: string) => void;
  refreshData: () => void;
  FAQ_DATA: { q: string; a: string }[];
  currentUser?: User | null;
  onToggleCurrency?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  settings, 
  heroNeetScore, 
  setHeroNeetScore, 
  handleEligibilityCheck, 
  refreshData, 
  FAQ_DATA, 
  currentUser 
}) => {
  const navigate = useNavigate();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'budget' | 'top' | 'mess'>('all');

  const FEATURED_UNIS = DETAILED_UNIVERSITIES.slice(0, 8);

  const filteredUnis = FEATURED_UNIS.filter(u => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.location.toLowerCase().includes(q)) return false;
    }
    if (selectedFilter === 'budget') return u.tuition_fee_rub < 350000;
    if (selectedFilter === 'top') return u.ranking.includes('1') || u.ranking.includes('Top');
    if (selectedFilter === 'mess') return u.indian_mess;
    return true;
  });

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-800">

      {/* 1. TOP HERO & GREETING HEADER (Mirrors Android HomeScreen Top Banner) */}
      <section className="relative pt-24 pb-20 sm:pt-32 sm:pb-24 md:pt-40 md:pb-28 overflow-hidden bg-[#0f172a] text-white">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImg} 
            alt="Indian MBBS Students in Russia" 
            className="w-full h-full object-cover opacity-35 transition-transform duration-1000 scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/95 via-[#0f172a]/90 to-[#0f172a]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl">
            {/* Admissions Badge */}
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold px-3.5 py-1.5 rounded-full mb-4 tracking-wide uppercase shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              NMC FMGL Gazette Compliant • Session 2026-27
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-4 tracking-tight">
              Study MBBS in Russia <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
                100% English Medium
              </span>
            </h1>
            
            <p className="text-sm sm:text-base md:text-lg text-slate-300 mb-8 leading-relaxed max-w-2xl">
              Direct seat allotment in top Russian government medical universities. 54-month coursework + 12-month clinical internship, transparent fees, Indian hostel mess & verified NExT/FMGE training.
            </p>

            {/* Quick Search Bar (Android HomeScreen Search Bar Parity) */}
            <div className="bg-white p-2 rounded-2xl shadow-xl flex items-center gap-2 max-w-xl border border-slate-200">
              <span className="material-symbols-outlined text-slate-400 ml-2">search</span>
              <input 
                type="text" 
                placeholder="Search 40+ universities, cities, fees..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 p-2 text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button 
                onClick={() => navigate('/explorer')}
                className="px-4 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FLOATING HERO ADMISSION APPLICATION CARD (Mirrors Android HomeScreen Floating Hero Card) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-10 relative z-20">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] font-black text-amber-800 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[14px]">campaign</span>
              ADMISSIONS OPEN 2026
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Start Your Official MBBS Admission Application
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
              Direct seat reservation, 100% English medium & fast-track Russian Ministry electronic visa invitation letter.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
            {currentUser ? (
              <>
                <button 
                  onClick={() => navigate('/apply')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition hover:scale-105"
                >
                  <span>Fill Admission Form</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                <button 
                  onClick={() => navigate('/tracker')}
                  className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 transition"
                >
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">timeline</span>
                  <span>Track Admission</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => navigate('/auth')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-[#0f172a] hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 transition hover:scale-105"
                >
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  <span>Sign In / Sign Up to Apply</span>
                </button>
                <button 
                  onClick={() => navigate('/auth')}
                  className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 transition opacity-70"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-400">lock</span>
                  <span>Track Dossier</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. 6 QUICK ACTION GRID (Direct Android HomeScreen Parity) */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Quick Admission Tools</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Direct access to Russian MBBS calculators, AI counselor & documentation vault</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {[
            { title: 'Universities', sub: '40+ Recognized', icon: 'school', color: 'text-blue-600', bg: 'bg-blue-50', link: '/explorer', requiresAuth: false },
            { title: '6-Yr Calculator', sub: 'INR/RUB/USD', icon: 'calculate', color: 'text-emerald-600', bg: 'bg-emerald-50', link: '/calculator', requiresAuth: false },
            { title: 'AI MD Advisor', sub: '24/7 Gemini AI', icon: 'smart_toy', color: 'text-purple-600', bg: 'bg-purple-50', link: '/ai-counselor', requiresAuth: true },
            { title: 'Apply Online', sub: 'Session 2026', icon: 'edit_document', color: 'text-amber-600', bg: 'bg-amber-50', link: '/apply', requiresAuth: true },
            { title: 'Live Tracker', sub: '5 Milestones', icon: 'timeline', color: 'text-teal-600', bg: 'bg-teal-50', link: '/tracker', requiresAuth: true },
            { title: 'Counselor Desk', sub: 'Amit Gurjar', icon: 'support_agent', color: 'text-rose-600', bg: 'bg-rose-50', link: '/counselor', requiresAuth: true }
          ].map((act, i) => {
            const isDimmed = !currentUser && act.requiresAuth;
            return (
              <div 
                key={i}
                onClick={() => navigate(isDimmed ? '/auth' : act.link)}
                className={`p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-xs hover:shadow-md cursor-pointer transition flex flex-col items-center text-center group relative overflow-hidden ${isDimmed ? 'opacity-65 hover:opacity-90' : ''}`}
              >
                {isDimmed && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-[12px]">lock</span>
                  </div>
                )}
                <div className={`w-12 h-12 rounded-2xl ${act.bg} ${act.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <span className="material-symbols-outlined text-[24px]">{act.icon}</span>
                </div>
                <h3 className="font-extrabold text-xs text-slate-900">{act.title}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{isDimmed ? 'Sign in to access' : act.sub}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. FEATURED UNIVERSITIES SHOWCASE */}
      <section className="py-12 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-black text-amber-600 uppercase tracking-wider">Top Medical Institutes</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Recognized Russian Universities</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">WHO, NMC & Ministry of Health of Russian Federation accredited</p>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
              {[
                { id: 'all', label: 'All (40+)' },
                { id: 'budget', label: 'Under ₹3.5L/Yr' },
                { id: 'top', label: 'Top Ranked' },
                { id: 'mess', label: 'Indian Mess' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    selectedFilter === f.id 
                      ? 'bg-[#0f172a] text-white shadow-sm' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredUnis.map(u => {
              const inrFee = (u.tuition_fee_rub * 0.95 / 100000).toFixed(1);
              return (
                <div key={u.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-lg transition flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                        NMC Recognized
                      </span>
                      <span className="text-xs font-bold text-amber-600">
                        ⭐ {u.ranking}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-amber-600 transition line-clamp-2">
                      {u.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      {u.location}
                    </p>

                    <div className="mt-4 p-3 bg-white rounded-2xl border border-slate-200/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Tuition Fee</span>
                        <span className="font-bold text-slate-900">₹{inrFee} Lakhs / yr</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Hostel Fee</span>
                        <span className="font-bold text-slate-900">₹{Math.round(u.hostel_fee_rub * 0.95 / 1000)}k / yr</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-slate-500">Indian Mess</span>
                        <span className="font-bold text-emerald-600">{u.indian_mess ? 'Available ✅' : 'Self-Cook'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-5">
                    <button 
                      onClick={() => navigate('/explorer')}
                      className="py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition"
                    >
                      Details
                    </button>
                    <button 
                      onClick={() => navigate('/apply?uni=' + u.id)}
                      className="py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold transition"
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <button 
              onClick={() => navigate('/explorer')}
              className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition inline-flex items-center gap-2"
            >
              <span>Explore All 40+ Russian Medical Universities</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. 6-YEAR MBBS BUDGET CALCULATOR SECTION */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <span className="text-xs font-black text-emerald-600 uppercase tracking-wider">Accurate Financial Planner</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">6-Year MBBS Cost Estimator</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Calculates Tuition, Hostel, Indian Mess, Medical Insurance & Visa in INR / RUB / USD</p>
        </div>
        <div className="relative">
          <div className={!currentUser ? "opacity-35 pointer-events-none select-none blur-[1.5px] transition-all" : ""}>
            <MbbsBudgetCalculator onApplyWithBudget={() => navigate('/apply')} />
          </div>
          {!currentUser && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
              <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-[28px]">lock</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    Sign In to Access 6-Year Cost Estimator
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Create a free student account to customize lifestyle preferences, download official PDF cost breakdowns, and reserve university seats.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => navigate('/auth')}
                    className="w-full py-3 px-5 bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    <span>Sign In / Sign Up</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. AI ELIGIBILITY EVALUATOR SECTION */}
      <section className="py-14 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <span className="text-xs font-black text-purple-600 uppercase tracking-wider">Instant NMC Evaluation</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Check Your MBBS Eligibility</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Validate your NEET score, PCB marks & category against NMC FMGL 2021 Gazette rules</p>
          </div>
          <div className="relative">
            <div className={!currentUser ? "opacity-35 pointer-events-none select-none blur-[1.5px] transition-all" : ""}>
              <AiEligibilityChecker />
            </div>
            {!currentUser && (
              <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
                <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
                    <span className="material-symbols-outlined text-[28px]">lock</span>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                      Sign In to Check Your MBBS Eligibility
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                      Instant evaluation of your 12th PCB marks & NEET scorecard against NMC FMGL Gazette 2021 regulations with personalized advice.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => navigate('/auth')}
                      className="w-full py-3 px-5 bg-purple-900 hover:bg-purple-950 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">login</span>
                      <span>Sign In / Sign Up</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. 5-STAGE OFFICIAL ADMISSION PROCESS */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-black text-blue-600 uppercase tracking-wider">Hassle-Free Direct Admission</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Our 5-Stage Admission Process</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">From online application to landing in Russia and getting your hostel keys</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { step: '01', title: 'Application Form', desc: 'Fill candidate details & academic marks online.', icon: 'edit_note' },
            { step: '02', title: 'Admission Letter', desc: 'Official provisional letter issued in 48-72 hours.', icon: 'verified' },
            { step: '03', title: 'Ministry Invitation', desc: 'MVD Federal electronic study visa invitation.', icon: 'mark_email_read' },
            { step: '04', title: 'Visa Stamping', desc: 'Consulate study visa stamped on passport.', icon: 'flight_takeoff' },
            { step: '05', title: 'Campus Arrival', desc: 'Delhi flight escort, pickup & hostel check-in.', icon: 'hotel_class' }
          ].map((st, i) => (
            <div key={i} className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#0f172a] text-amber-400 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[20px]">{st.icon}</span>
                  </div>
                  <span className="text-xs font-black text-slate-300 font-mono">{st.step}</span>
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">{st.title}</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{st.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. MEET OUR EXPERTS */}
      <section className="py-14 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Meet Senior Admissions Directors</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">Direct guidance from Russia medical education consultants with zero middleman</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-extrabold text-2xl shrink-0">
                AG
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-white">Amit Gurjar</h3>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Director & Senior Consultant</p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  "We ensure every Indian medical aspirant receives genuine, transparent guidance and complete support from admission to graduation."
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <a href="https://wa.me/917375017401" target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">chat</span> WhatsApp
                  </a>
                  <a href="tel:+917375017401" className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">call</span> Call Direct
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-extrabold text-2xl shrink-0">
                MG
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-white">Monu Gurjar</h3>
                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Head of Admissions & Operations</p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  "Managing student documentation, MVD invitations, embassy visa stamping, and university arrival with total reliability."
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <button onClick={() => setIsFeedbackOpen(true)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">support_agent</span> Book Counseling
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Consultation Modal */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-[90%] md:w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 shadow-2xl relative">
            <button onClick={() => setIsFeedbackOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition">
              <span className="material-symbols-outlined text-slate-600 text-[18px]">close</span>
            </button>
            <div className="mb-6">
              <h3 className="text-xl font-extrabold text-slate-900">Book Free MBBS Counseling Session</h3>
              <p className="text-xs text-slate-500 mt-1">Get 1-on-1 expert university recommendations tailored to your NEET score and budget.</p>
            </div>
            <FeedbackForm onSuccess={() => setTimeout(() => setIsFeedbackOpen(false), 2000)} />
          </div>
        </div>
      )}

    </div>
  );
};
