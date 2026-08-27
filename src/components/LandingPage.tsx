import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeedbackForm } from './FeedbackForm';
import { PlatformFeedbackModal } from './PlatformFeedbackModal';
import { CurrencyConverter } from './CurrencyConverter';
import { AppSettings, User } from '../types';
import { TeamMember } from '../data/teamData';
import { getTeamMembers } from '../services/db';
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

export const LandingPage: React.FC<LandingPageProps> = ({ settings, heroNeetScore, setHeroNeetScore, handleEligibilityCheck, handleSpecificNavigation, refreshData, FAQ_DATA, currentUser, onToggleCurrency }) => {
  const navigate = useNavigate();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      navigate(currentUser.role === 'admin' ? '/admin' : '/user');
    }
  }, [currentUser, navigate]);

  return (
    <div className="bg-white min-h-screen font-sans text-slate-800">

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 md:pt-48 md:pb-28 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          <img src={heroImg} alt="Indian MBBS Students in Russia" className="w-full h-full object-cover opacity-55 transition-transform duration-1000 scale-105" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/85 to-[#0f172a]/30"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-block bg-[#f59e0b] text-amber-950 text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full mb-4 sm:mb-6 tracking-wide uppercase shadow-sm">
              Trusted Consultancy
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-4 sm:mb-6 tracking-tight">
              Your Gateway to Global Medical Excellence
            </h1>
            <p className="text-sm sm:text-lg md:text-xl text-slate-300 mb-8 sm:mb-10 leading-relaxed max-w-xl font-medium">
              Empowering Indian students to pursue world-class MBBS degrees in Russia with full admission support, expert guidance, and uncompromising transparency.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button onClick={() => setIsFeedbackOpen(true)} className="bg-[#f59e0b] text-amber-950 px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl font-bold text-sm sm:text-base hover:bg-[#d97706] transition-colors shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2">
                Apply for Consultation <span className="material-symbols-outlined text-[18px] sm:text-[20px]">arrow_forward</span>
              </button>
              <button onClick={() => navigate('/universities')} className="bg-transparent border-2 border-white/30 text-white px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl font-bold text-sm sm:text-base hover:bg-white/10 transition-colors flex items-center justify-center">
                View Universities
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Sleek Premium SaaS Quick Admission Tools Banner */}
      <div className="bg-slate-950 border-y border-slate-800/80 py-4 sm:py-5 px-4 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-slate-200 shrink-0 mb-1.5 md:mb-0">
            <span className="w-[6px] h-[6px] rounded-full bg-amber-400 animate-pulse shrink-0" />
            <h3 className="text-sm sm:text-[15px] font-semibold text-slate-200 tracking-tight">Quick Admission Tools</h3>
          </div>
          
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
            <button
              onClick={() => navigate('/explorer')}
              className="px-3.5 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <span className="material-symbols-outlined text-[16px]">travel_explore</span> University Explorer
            </button>
            <button
              onClick={() => navigate('/calculator')}
              className="px-3.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <span className="material-symbols-outlined text-[16px]">calculate</span> 6-Year Calculator
            </button>
            <button
              onClick={() => navigate('/eligibility')}
              className="px-3.5 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span> AI Evaluator
            </button>
            <button
              onClick={() => navigate('/counselor')}
              className="px-3.5 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <span className="material-symbols-outlined text-[16px]">support_agent</span> Senior Counselor
            </button>
          </div>
        </div>
      </div>

      {/* Why Study MBBS in Russia? */}
      <section id="services" className="py-14 sm:py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-4">Why Study MBBS in Russia?</h2>
            <p className="text-slate-500 text-sm sm:text-lg max-w-2xl mx-auto">A strategic choice for aspiring medical professionals seeking quality education and global recognition.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-8">
            <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xs hover:shadow-md transition-shadow flex flex-row sm:flex-col items-start gap-4 sm:gap-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-full bg-[#1e3a8a] text-white flex items-center justify-center mb-0 sm:mb-6 shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[20px] sm:text-[24px]">payments</span>
              </div>
              <div>
                <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1 sm:mb-3">Low Tuition Fees</h3>
                <p className="text-slate-600 leading-snug sm:leading-relaxed text-xs sm:text-sm">Subsidized education by the Russian government makes pursuing an MBBS highly affordable compared to private Indian colleges.</p>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xs hover:shadow-md transition-shadow flex flex-row sm:flex-col items-start gap-4 sm:gap-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-full bg-[#1e3a8a] text-white flex items-center justify-center mb-0 sm:mb-6 shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[20px] sm:text-[24px]">public</span>
              </div>
              <div>
                <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1 sm:mb-3">WHO/NMC Recognition</h3>
                <p className="text-slate-600 leading-snug sm:leading-relaxed text-xs sm:text-sm">Degrees from top Russian medical universities are globally recognized, allowing graduates to practice in India and worldwide.</p>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xs hover:shadow-md transition-shadow flex flex-row sm:flex-col items-start gap-4 sm:gap-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-full bg-[#1e3a8a] text-white flex items-center justify-center mb-0 sm:mb-6 shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[20px] sm:text-[24px]">verified_user</span>
              </div>
              <div>
                <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1 sm:mb-3">Direct Admission</h3>
                <p className="text-slate-600 leading-snug sm:leading-relaxed text-xs sm:text-sm">Secure your seat based on 12th-grade marks and NEET qualification. No hidden donations or entrance exams required.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Universities */}
      <section id="universities" className="py-14 sm:py-20 md:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-3">Top Russian Medical Universities</h2>
              <p className="text-slate-500 text-sm sm:text-lg">We partner with prestigious institutions offering English-medium MBBS programs.</p>
            </div>
            <button onClick={() => navigate('/universities')} className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1 hover:text-[#f59e0b] transition-colors shrink-0">
              View All Universities <span className="material-symbols-outlined text-[16px] sm:text-[18px]">arrow_forward</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[
              { id: 3, name: "Kazan Federal University", loc: "Kazan, Russia", img: "https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", rating: "4.8" },
              { id: 1, name: "First Moscow State Med", loc: "Moscow, Russia", img: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", rating: "4.9" },
              { id: 5, name: "Crimea Federal University", loc: "Simferopol, Russia", img: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", rating: "4.7" },
              { id: 4, name: "Bashkir State Med Uni", loc: "Ufa, Russia", img: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", rating: "4.6" }
            ].map((uni, i) => (
              <div key={i} className="bg-white rounded-2xl sm:rounded-[24px] border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col">
                <div className="h-28 sm:h-40 relative overflow-hidden shrink-0">
                  <img src={uni.img} alt={uni.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs font-bold text-slate-900 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[12px] sm:text-[14px]">star</span> {uni.rating}
                  </div>
                </div>
                <div className="p-3 sm:p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-slate-900 text-xs sm:text-[15px] mb-0.5 sm:mb-1 line-clamp-2">{uni.name}</h3>
                  <p className="text-slate-500 text-[10px] sm:text-xs flex items-center gap-0.5 mb-3 shrink-0">
                    <span className="material-symbols-outlined text-[12px] sm:text-[14px]">location_on</span> {uni.loc}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-3 shrink-0">
                    <div className="border border-slate-100 bg-slate-50 rounded-md sm:rounded-lg p-1.5 sm:p-2">
                      <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold tracking-wider mb-0.5">DURATION</div>
                      <div className="text-[10px] sm:text-xs font-semibold text-slate-800">6 Years</div>
                    </div>
                    <div className="border border-slate-100 bg-slate-50 rounded-md sm:rounded-lg p-1.5 sm:p-2">
                      <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold tracking-wider mb-0.5">MEDIUM</div>
                      <div className="text-[10px] sm:text-xs font-semibold text-slate-800">English</div>
                    </div>
                  </div>
                  <button onClick={() => navigate('/university/' + uni.id)} className="mt-auto w-full py-2 sm:py-2.5 border border-slate-200 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet Our Experts */}
      <section id="experts" className="py-14 sm:py-20 md:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-4">Meet Our Experts</h2>
            <p className="text-slate-500 text-sm sm:text-lg">Founded by alumni who understand the journey, we provide authentic guidance you can trust.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xs hover:shadow-md transition-all flex flex-row items-start text-left gap-3.5 sm:gap-5">
              <img src="https://images.unsplash.com/photo-1537368910025-700350fe46c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80" alt="Amit Gurjar" className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border-2 border-slate-100 shadow-xs" />
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-xl font-bold text-slate-900 leading-tight">Amit Gurjar</h3>
                <p className="text-[#d97706] text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5 sm:mb-3">Co-Founder & Director</p>
                <p className="text-slate-600 text-xs sm:text-sm italic leading-snug sm:leading-relaxed">
                  "We built MedRussia to be the honest, transparent bridge between Indian students and their medical dreams. Your success is our mission."
                </p>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xs hover:shadow-md transition-all flex flex-row items-start text-left gap-3.5 sm:gap-5">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80" alt="Monu Gurjar" className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border-2 border-slate-100 shadow-xs" />
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-xl font-bold text-slate-900 leading-tight">Monu Gurjar</h3>
                <p className="text-[#d97706] text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5 sm:mb-3">Co-Founder & Head of Operations</p>
                <p className="text-slate-600 text-xs sm:text-sm italic leading-snug sm:leading-relaxed">
                  "Navigating foreign admissions can be daunting. Our team ensures every step, from application to arrival, is seamless and secure."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Streamlined Process */}
      <section id="process" className="py-14 sm:py-20 md:py-28 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-4">Our Streamlined Process</h2>
            <p className="text-slate-500 text-sm sm:text-lg">A transparent, step-by-step journey from your first inquiry to your first day of class.</p>
          </div>
          
          <div className="relative border-l-2 border-slate-200 ml-4 sm:ml-12 space-y-6 sm:space-y-12 pb-2">
            {[
              { icon: 'support_agent', title: 'Initial Counseling', desc: 'Free consultation to assess eligibility and select the right university.' },
              { icon: 'description', title: 'Application & Admission Letter', desc: 'Submission of documents and securing the official admission letter.' },
              { icon: 'flight_takeoff', title: 'Visa Processing', desc: 'Complete assistance with student visa application and embassy formalities.' },
              { icon: 'school', title: 'Departure & Onboarding', desc: 'Travel arrangements, airport pickup, and hostel accommodation in Russia.' },
            ].map((step, idx) => (
              <div key={idx} className="relative pl-7 sm:pl-16">
                <div className="absolute -left-4 top-0 w-8 h-8 sm:w-12 sm:h-12 bg-[#1e3a8a] rounded-full flex items-center justify-center text-white border-2 sm:border-4 border-slate-50 shadow-xs">
                  <span className="material-symbols-outlined text-[16px] sm:text-[20px]">{step.icon}</span>
                </div>
                <div>
                  <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-0.5 sm:mb-1">{step.title}</h3>
                  <p className="text-slate-500 text-xs sm:text-sm leading-snug">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isFeedbackOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 fade-in-up">
          <div className="bg-white w-[90%] md:w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 md:p-8 shadow-xl relative">
            <button onClick={() => setIsFeedbackOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
              <span className="material-symbols-outlined text-slate-500" style={{fontSize:'18px'}}>close</span>
            </button>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Apply for Consultation</h3>
              <p className="text-slate-500 mt-2">Submit your query and our experts will get back to you shortly.</p>
            </div>
            <FeedbackForm onSuccess={() => setTimeout(() => setIsFeedbackOpen(false), 2000)} />
          </div>
        </div>
      )}
    </div>
  );
};
