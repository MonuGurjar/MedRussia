
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeedbackForm } from './FeedbackForm';
import { PlatformFeedbackModal } from './PlatformFeedbackModal';
import { AppSettings, FeedbackEntry } from '../types';
import { TeamMember } from '../data/teamData';
import { getTeamMembers } from '../services/db';

interface LandingPageProps {
    settings: AppSettings;
    heroNeetScore: string;
    setHeroNeetScore: (val: string) => void;
    handleEligibilityCheck: () => void;
    handleSpecificNavigation: (v: string) => void;
    refreshData: () => void;
    WhatsAppIcon: React.FC<{ className?: string }>;
    FAQ_DATA: { q: string; a: string }[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
    settings,
    heroNeetScore,
    setHeroNeetScore,
    handleEligibilityCheck,
    handleSpecificNavigation,
    refreshData,
    WhatsAppIcon,
    FAQ_DATA
}) => {
    const navigate = useNavigate();
    const [featuredMembers, setFeaturedMembers] = useState<TeamMember[]>([]);

    useEffect(() => {
        getTeamMembers().then(members => {
            setFeaturedMembers(members.filter(m => m.isFeatured).slice(0, 4));
        });
    }, []);

    return (
        <div className="animate-in fade-in duration-500 overflow-x-hidden">

            {/* SECTION 1: HERO */}
            <div className="text-center mt-6 md:mt-16 mb-8 md:mb-12 space-y-4 md:space-y-6 max-w-5xl mx-auto px-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider mb-2 md:mb-4 border border-indigo-100 dark:border-indigo-800">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    Future Doctors Hub
                </div>
                <h1 className="text-3xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                    Study MBBS in Russia with <br className="hidden md:block" />
                    <span className="text-indigo-600 dark:text-indigo-400">Expert Guidance</span>
                </h1>
                <p className="text-sm md:text-xl text-slate-600 dark:text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed px-4 md:px-0">
                    Trusted by 600+ Indian students. No hidden fees, just honest advice from seniors actually studying there.
                </p>

                {/* Trust Badges */}
                <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-2">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold flex items-center gap-1.5 md:gap-2 border border-emerald-100 dark:border-emerald-800 shadow-sm">
                        <span>🛡️</span> Zero Commission Bias
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold flex items-center gap-1.5 md:gap-2 border border-blue-100 dark:border-blue-800 shadow-sm">
                        <span>👨‍⚕️</span> Counseling by Students in Russia
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mt-6 md:mt-8 px-4 md:px-0">
                    <button
                        onClick={() => {
                            const el = document.getElementById('feedback-form');
                            if (el) {
                                el.scrollIntoView({ behavior: 'smooth' });
                                el.classList.add('ring-4', 'ring-indigo-200', 'dark:ring-indigo-900');
                                setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-200', 'dark:ring-indigo-900'), 1500);
                            }
                        }}
                        className="px-6 py-3 md:px-8 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-sm md:text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-none hover:-translate-y-1 active:translate-y-0"
                    >
                        Get Free Counseling
                    </button>
                    {settings?.features?.universityCompare && (
                        <button
                            onClick={() => handleSpecificNavigation('compare')}
                            className="px-6 py-3 md:px-8 md:py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl md:rounded-2xl font-black text-sm md:text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                        >
                            <span>⚖️</span> Compare Universities
                        </button>
                    )}
                </div>
            </div>

            {/* SECTION 2: ELIGIBILITY CHECK */}
            {settings?.features?.eligibilityCheck !== false && (
                <div className="max-w-4xl mx-auto px-4 md:px-0 mb-16 md:mb-24">
                    <div className="bg-slate-900 dark:bg-black rounded-3xl md:rounded-[2.5rem] p-6 md:p-12 text-center text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/30 rounded-full blur-3xl group-hover:bg-indigo-600/40 transition-colors"></div>

                        <div className="relative z-10">
                            <h2 className="text-xl md:text-4xl font-black mb-2 md:mb-4">Check MBBS Eligibility</h2>
                            <p className="text-slate-400 mb-6 md:mb-8 font-medium text-xs md:text-lg">Enter your NEET score — takes 10 seconds</p>
                            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 max-w-lg mx-auto">
                                <input
                                    type="number"
                                    placeholder="NEET Score (e.g. 350)"
                                    className="flex-1 px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 font-bold text-base md:text-lg outline-none focus:bg-white/20 focus:border-white/50 transition-all text-center sm:text-left"
                                    value={heroNeetScore}
                                    onChange={(e) => setHeroNeetScore(e.target.value)}
                                />
                                <button
                                    onClick={handleEligibilityCheck}
                                    className="px-6 py-3 md:px-8 md:py-4 bg-white text-indigo-900 font-black rounded-xl md:rounded-2xl hover:bg-indigo-50 transition-all shadow-lg active:scale-95 whitespace-nowrap text-sm md:text-lg"
                                >
                                    Check Eligibility
                                </button>
                            </div>
                            <p className="text-[10px] md:text-xs text-slate-500 mt-3 md:mt-4 font-medium">*Official verification required for final admission.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 3: WHY MEDRUSSIA */}
            <div className="mb-12 md:mb-20 px-4 md:px-0">
                <div className="text-center mb-6 md:mb-12">
                    <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 md:mb-4">Why MedRussia?</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-xs md:text-lg">We bridge the gap between India and Russia.</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {[
                        { title: "50+ Verified Universities", icon: "🎓", desc: "Curated list of top NMC recognized colleges." },
                        { title: "Student Guidance", icon: "👨‍⚕️", desc: "Mentorship from Indian seniors currently in Russia." },
                        { title: "Direct University Fees", icon: "📊", desc: "Direct university payments. No hidden commissions." },
                        { title: "Direct Support", icon: "💬", desc: "Instant WhatsApp support for parents and students." }
                    ].map((item, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 p-4 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl dark:hover:shadow-indigo-900/20 md:hover:-translate-y-1 transition-all duration-300 text-center group flex flex-col items-center justify-start h-full">
                            <div className="w-12 h-12 md:w-16 md:h-16 mx-auto bg-indigo-50 dark:bg-indigo-900/30 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-3xl mb-3 md:mb-6 group-hover:scale-110 transition-transform shrink-0">
                                {item.icon}
                            </div>
                            <h3 className="font-bold text-xs md:text-xl text-slate-900 dark:text-white mb-1 md:mb-2 leading-tight">
                                {item.title}
                            </h3>
                            <p className="text-[10px] md:text-sm text-slate-500 dark:text-slate-400 leading-snug md:leading-relaxed line-clamp-3 md:line-clamp-none">
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* SECTION: MEET OUR TEAM */}
            <div className="mb-12 md:mb-20 px-4 md:px-0">
                <div className="text-center mb-6 md:mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider mb-3 md:mb-4 border border-purple-100 dark:border-purple-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                        Our People
                    </div>
                    <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 md:mb-4">Meet Our Team</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-xs md:text-lg max-w-xl mx-auto">Real students and mentors who've been through the journey themselves.</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {featuredMembers.map((member) => (
                        <div key={member.id} className="bg-white dark:bg-slate-800 p-4 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl dark:hover:shadow-indigo-900/20 md:hover:-translate-y-1 transition-all duration-300 text-center group flex flex-col items-center justify-start h-full">
                            <div className="w-14 h-14 md:w-20 md:h-20 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-4xl mb-3 md:mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg shadow-indigo-100/50 dark:shadow-none border border-indigo-200/50 dark:border-indigo-700/30 overflow-hidden">
                                {member.profileImage ? (
                                    <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                    member.emoji
                                )}
                            </div>
                            <h3 className="font-bold text-xs md:text-lg text-slate-900 dark:text-white mb-0.5 md:mb-1 leading-tight">
                                {member.name}
                            </h3>
                            <p className="text-indigo-600 dark:text-indigo-400 text-[9px] md:text-xs font-bold mb-1 md:mb-2">{member.role}</p>
                            <p className="text-[10px] md:text-sm text-slate-500 dark:text-slate-400 leading-snug md:leading-relaxed line-clamp-2 md:line-clamp-3">
                                {member.bio}
                            </p>
                        </div>
                    ))}
                </div>
                <div className="text-center mt-6 md:mt-10">
                    <button
                        onClick={() => navigate('/team')}
                        className="inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl md:rounded-2xl font-black text-sm md:text-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all border border-indigo-100 dark:border-indigo-800 hover:-translate-y-0.5"
                    >
                        View All Team Members
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* SECTION 4: HOW IT WORKS */}
            <div className="mb-16 md:mb-24 relative px-4 md:px-0">
                <div className="text-center mb-8 md:mb-16">
                    <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white">How it works</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 relative z-10">
                    <div className="hidden md:block absolute top-10 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-700 -z-10"></div>
                    {[
                        { step: "1", title: "Submit Query", desc: "Share budget & prefs." },
                        { step: "2", title: "Get Options", desc: "Get university list." },
                        { step: "3", title: "Compare", desc: "Check fees & ranking." },
                        { step: "4", title: "Apply", desc: "Secure admission." }
                    ].map((item, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-700 text-center shadow-sm relative">
                            <div className="w-12 h-12 md:w-20 md:h-20 bg-indigo-600 text-white rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-2xl mx-auto mb-4 md:mb-6 border-4 md:border-8 border-slate-50 dark:border-slate-900 shadow-lg transform -translate-y-6 md:-translate-y-10">{item.step}</div>
                            <div className="-mt-4 md:-mt-6">
                                <h3 className="font-bold text-sm md:text-xl text-slate-900 dark:text-white mb-1 md:mb-2">{item.title}</h3>
                                <p className="text-[10px] md:text-sm text-slate-500 dark:text-slate-400 font-medium">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SECTION 5: TRUST & FORM */}
            <div className="grid lg:grid-cols-2 gap-8 md:gap-20 items-start mb-16 md:mb-24 px-4 md:px-0">
                <div className="space-y-6 md:space-y-10">
                    <div>
                        <h2 className="text-2xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight mb-3 md:mb-6">
                            We prioritize <br /> <span className="text-emerald-600 dark:text-emerald-400">Trust</span> and Transparency.
                        </h2>
                        <p className="text-sm md:text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                            Applying for MBBS abroad is a big decision. We ensure you have accurate information, direct university access, and zero false promises.
                        </p>
                    </div>
                    <div className="space-y-3 md:space-y-4">
                        {[
                            "Completely transparent admission process",
                            "We don’t sell fake promises or hidden terms",
                            "You choose the university, we guide the process"
                        ].map((text, i) => (
                            <div key={i} className="flex items-center gap-3 md:gap-4 p-3 md:p-5 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 transition-transform hover:translate-x-2">
                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs md:text-sm shrink-0">✓</div>
                                <span className="font-bold text-slate-700 dark:text-emerald-100 text-xs md:text-lg">{text}</span>
                            </div>
                        ))}
                    </div>
                    <div className="pt-2 md:pt-4">
                        <a
                            href="https://wa.me/917375017401?text=Hello%20Amit%20Sir,%20I%20want%20honest%20advice%20regarding%20MBBS%20in%20Russia."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-sm md:text-lg"
                        >
                            <WhatsAppIcon className="w-6 h-6 md:w-8 md:h-8" />
                            <span>Chat directly on WhatsApp</span>
                        </a>
                    </div>
                </div>

                <div id="feedback-form" className="bg-white dark:bg-slate-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-slate-200 dark:border-slate-700 relative">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl md:text-9xl font-black rotate-12 pointer-events-none">📝</div>
                    <div className="mb-6 md:mb-8 relative z-10">
                        <div className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] md:text-xs font-bold uppercase mb-2 md:mb-3">Free Assessment</div>
                        <h3 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white mb-2">Start Your Application</h3>
                        <p className="text-xs md:text-base text-slate-500 dark:text-slate-400 font-medium">Fill this form to get a detailed roadmap and university options within 24 hours.</p>
                    </div>
                    <div className="relative z-10">
                        <FeedbackForm onSuccess={refreshData} />
                    </div>
                </div>
            </div>

            {/* FAQs */}
            <div className="mt-12 md:mt-24 mb-12 px-4 md:px-0">
                <div className="text-center mb-8 md:mb-12">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">Frequently Asked Questions</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                    {FAQ_DATA.map((item, index) => (
                        <div key={index} className="bg-white dark:bg-slate-800 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
                            <h3 className="font-black text-sm md:text-lg text-slate-900 dark:text-white mb-2 md:mb-3 flex items-start gap-2 md:gap-3">
                                <span className="text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0 text-xs md:text-sm">Q</span>
                                {item.q}
                            </h3>
                            <p className="text-xs md:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed pl-8 md:pl-11">
                                {item.a}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Disclaimer */}
            <div className="py-6 md:py-8 px-4 text-center mt-8 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
                    <strong>Counseling Disclaimer:</strong> MedRussia provides guidance and counseling support. Final admissions, fees, and eligibility are subject to university and regulatory authority decisions.
                </p>
            </div>

            {/* Floating Feedback Hub */}
            <PlatformFeedbackModal />
        </div>
    );
};
