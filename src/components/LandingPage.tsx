import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeedbackForm } from './FeedbackForm';
import { PlatformFeedbackModal } from './PlatformFeedbackModal';
import { AppSettings } from '../types';
import { TeamMember } from '../data/teamData';
import { getTeamMembers } from '../services/db';

interface LandingPageProps {
  settings: AppSettings;
  heroNeetScore: string;
  setHeroNeetScore: (val: string) => void;
  handleEligibilityCheck: () => void;
  handleSpecificNavigation: (v: string) => void;
  refreshData: () => void;
  FAQ_DATA: { q: string; a: string }[];
}

export const LandingPage: React.FC<LandingPageProps> = ({ settings, heroNeetScore, setHeroNeetScore, handleEligibilityCheck, handleSpecificNavigation, refreshData, FAQ_DATA }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white min-h-screen font-sans text-slate-800">
      {/* Header */}
      <header className="absolute top-0 w-full z-50 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <span className="material-symbols-outlined text-slate-900 text-[28px]">medical_services</span>
            <span className="text-xl font-bold text-slate-900 tracking-tight">MedGuide Russia</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-bold text-slate-600">
            <a href="#universities" className="hover:text-slate-900 transition-colors">Universities</a>
            <a href="#services" className="hover:text-slate-900 transition-colors">Services</a>
            <a href="#process" className="hover:text-slate-900 transition-colors">Process</a>
            <a href="#experts" className="hover:text-slate-900 transition-colors">About Us</a>
          </nav>
          <button onClick={() => navigate('/auth')} className="bg-[#fbbf24] text-amber-950 px-6 py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#f59e0b] transition-colors shadow-sm">
            Apply Now
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" alt="Medical Students" className="w-full h-full object-cover opacity-40 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/80 to-transparent"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-block bg-[#f59e0b] text-amber-950 text-xs font-bold px-3 py-1 rounded-full mb-6 tracking-wide uppercase shadow-sm">
              Trusted Consultancy
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6 tracking-tight">
              Your Gateway to Global Medical Excellence
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-10 leading-relaxed max-w-xl font-medium">
              Empowering Indian students to pursue world-class MBBS degrees in Russia with full admission support, expert guidance, and uncompromising transparency.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => { document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }} className="bg-[#f59e0b] text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-[#d97706] transition-colors shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2">
                Apply for Consultation <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
              <button onClick={() => navigate('/compare')} className="bg-transparent border-2 border-white/30 text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-white/10 transition-colors flex items-center justify-center">
                View Universities
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Study MBBS in Russia? */}
      <section id="services" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Why Study MBBS in Russia?</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">A strategic choice for aspiring medical professionals seeking quality education and global recognition.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center mb-6">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Low Tuition Fees</h3>
              <p className="text-slate-600 leading-relaxed text-sm">Subsidized education by the Russian government makes pursuing an MBBS highly affordable compared to private Indian colleges.</p>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center mb-6">
                <span className="material-symbols-outlined">public</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">WHO/NMC Recognition</h3>
              <p className="text-slate-600 leading-relaxed text-sm">Degrees from top Russian medical universities are globally recognized, allowing graduates to practice in India and worldwide.</p>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center mb-6">
                <span className="material-symbols-outlined">verified_user</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Direct Admission</h3>
              <p className="text-slate-600 leading-relaxed text-sm">Secure your seat based on 12th-grade marks and NEET qualification. No hidden donations or entrance exams required.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Top Universities */}
      <section id="universities" className="py-20 md:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Top Russian Medical Universities</h2>
              <p className="text-slate-500 text-lg">We partner with prestigious institutions offering English-medium MBBS programs.</p>
            </div>
            <button onClick={() => navigate('/compare')} className="text-sm font-bold text-slate-900 flex items-center gap-1 hover:text-[#f59e0b] transition-colors shrink-0">
              View All Universities <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Kazan Federal University", loc: "Kazan, Russia", img: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", rating: "4.8" },
              { name: "First Moscow State Med", loc: "Moscow, Russia", img: "https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", rating: "4.9" },
              { name: "Crimea Federal University", loc: "Simferopol, Russia", img: "https://images.unsplash.com/photo-1595133649692-a17f22a57374?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", rating: "4.7" },
              { name: "Bashkir State Med Uni", loc: "Ufa, Russia", img: "https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", rating: "4.6" }
            ].map((uni, i) => (
              <div key={i} className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                <div className="h-40 relative overflow-hidden">
                  <img src={uni.img} alt={uni.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-slate-900 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">star</span> {uni.rating}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-slate-900 text-[15px] mb-1">{uni.name}</h3>
                  <p className="text-slate-500 text-xs flex items-center gap-1 mb-5">
                    <span className="material-symbols-outlined text-[14px]">location_on</span> {uni.loc}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    <div className="border border-slate-100 bg-slate-50 rounded-lg p-2">
                      <div className="text-[10px] text-slate-400 font-bold tracking-wider mb-0.5">DURATION</div>
                      <div className="text-xs font-semibold text-slate-800">6 Years</div>
                    </div>
                    <div className="border border-slate-100 bg-slate-50 rounded-lg p-2">
                      <div className="text-[10px] text-slate-400 font-bold tracking-wider mb-0.5">MEDIUM</div>
                      <div className="text-xs font-semibold text-slate-800">English</div>
                    </div>
                  </div>
                  <button onClick={() => navigate('/compare')} className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet Our Experts */}
      <section id="experts" className="py-20 md:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Meet Our Experts</h2>
            <p className="text-slate-500 text-lg">Founded by alumni who understand the journey, we provide authentic guidance you can trust.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
              <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80" alt="Amit Gurjar" className="w-24 h-24 rounded-full object-cover shrink-0 border-4 border-slate-50" />
              <div>
                <h3 className="text-xl font-bold text-slate-900">Amit Gurjar</h3>
                <p className="text-[#d97706] text-xs font-bold uppercase tracking-wider mb-4">Co-Founder & Director</p>
                <p className="text-slate-600 text-sm italic leading-relaxed">
                  "We built MedGuide Russia to be the honest, transparent bridge between Indian students and their medical dreams. Your success is our mission."
                </p>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
              <img src="https://images.unsplash.com/photo-1556157382-97eda2d62296?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80" alt="Monu Gurjar" className="w-24 h-24 rounded-full object-cover shrink-0 border-4 border-slate-50" />
              <div>
                <h3 className="text-xl font-bold text-slate-900">Monu Gurjar</h3>
                <p className="text-[#d97706] text-xs font-bold uppercase tracking-wider mb-4">Co-Founder & Head of Operations</p>
                <p className="text-slate-600 text-sm italic leading-relaxed">
                  "Navigating foreign admissions can be daunting. Our team ensures every step, from application to arrival, is seamless and secure."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Streamlined Process */}
      <section id="process" className="py-20 md:py-28 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Our Streamlined Process</h2>
            <p className="text-slate-500 text-lg">A transparent, step-by-step journey from your first inquiry to your first day of class.</p>
          </div>
          
          <div className="relative border-l border-slate-200 ml-6 md:ml-12 space-y-12 pb-4">
            {[
              { icon: 'support_agent', title: 'Initial Counseling', desc: 'Free consultation to assess eligibility and select the right university.' },
              { icon: 'description', title: 'Application & Admission Letter', desc: 'Submission of documents and securing the official admission letter.' },
              { icon: 'flight_takeoff', title: 'Visa Processing', desc: 'Complete assistance with student visa application and embassy formalities.' },
              { icon: 'school', title: 'Departure & Onboarding', desc: 'Travel arrangements, airport pickup, and hostel accommodation in Russia.' },
            ].map((step, idx) => (
              <div key={idx} className="relative pl-10 md:pl-16">
                <div className="absolute -left-6 top-0 w-12 h-12 bg-[#1e3a8a] rounded-full flex items-center justify-center text-white border-4 border-slate-50 shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">{step.icon}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-slate-500 text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-[#1e293b] pt-20 pb-10 text-slate-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-white text-[28px]">medical_services</span>
                <span className="text-xl font-bold text-white tracking-tight">MedGuide Russia</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your trusted partner for pursuing MBBS abroad. Expert guidance for a brighter medical career.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide text-sm">COMPANY</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Office Locations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide text-sm">LEGAL</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide text-sm">CONTACT US</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
                <li className="flex items-center gap-2 mt-4"><span className="material-symbols-outlined text-[18px]">mail</span> info@medguiderussia.com</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-700/50 pt-8 text-center text-xs text-slate-500">
            <p>© {new Date().getFullYear()} MedGuide Russia. Founded by Amit Gurjar & Monu Gurjar.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
