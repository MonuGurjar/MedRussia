
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TeamMember } from '../data/teamData';
import { getTeamMembers } from '../services/db';

const TeamMemberCard: React.FC<{ member: TeamMember; index: number }> = ({ member, index }) => (
    <div
        className="group bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-700 p-6 md:p-8 shadow-sm hover:shadow-2xl dark:hover:shadow-indigo-900/20 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden"
        style={{ animationDelay: `${index * 80}ms` }}
    >
        {/* Decorative gradient blob */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors duration-500" />

        <div className="relative z-10">
            {/* Avatar */}
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-2xl md:rounded-3xl flex items-center justify-center text-3xl md:text-4xl mb-4 md:mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg shadow-indigo-100/50 dark:shadow-none border border-indigo-200/50 dark:border-indigo-700/30 overflow-hidden">
                {member.profileImage ? (
                    <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                    member.emoji
                )}
            </div>

            {/* Name & Role */}
            <h3 className="text-base md:text-xl font-black text-slate-900 dark:text-white text-center mb-1">{member.name}</h3>
            <p className="text-indigo-600 dark:text-indigo-400 text-[11px] md:text-sm font-bold text-center mb-3 md:mb-4">{member.role}</p>

            {/* Specialization Badge */}
            <div className="flex justify-center mb-3 md:mb-4">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 rounded-lg text-[9px] md:text-[11px] font-bold uppercase tracking-wider border border-indigo-100 dark:border-indigo-800/50">
                    {member.specialization}
                </span>
            </div>

            {/* Bio */}
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed font-medium line-clamp-3 md:line-clamp-none">
                {member.bio}
            </p>

            {/* Social Links */}
            {member.socials && (
                <div className="flex justify-center gap-2 mt-4 md:mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                    {member.socials.whatsapp && (
                        <a href={member.socials.whatsapp} target="_blank" rel="noopener noreferrer"
                            className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:scale-110 transition-all border border-emerald-100 dark:border-emerald-800/40"
                            title="WhatsApp">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 md:w-4 md:h-4">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                        </a>
                    )}
                    {member.socials.instagram && (
                        <a href={member.socials.instagram} target="_blank" rel="noopener noreferrer"
                            className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 flex items-center justify-center hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:scale-110 transition-all border border-pink-100 dark:border-pink-800/40"
                            title="Instagram">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 md:w-4 md:h-4">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                        </a>
                    )}
                    {member.socials.youtube && (
                        <a href={member.socials.youtube} target="_blank" rel="noopener noreferrer"
                            className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/40 hover:scale-110 transition-all border border-red-100 dark:border-red-800/40"
                            title="YouTube">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 md:w-4 md:h-4">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                        </a>
                    )}
                </div>
            )}
        </div>
    </div>
);

export const TeamPage: React.FC = () => {
    const navigate = useNavigate();
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getTeamMembers().then(members => {
            setTeamMembers(members);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    return (
        <div className="animate-in fade-in duration-500 overflow-x-hidden">
            {/* Back to Home */}
            <div className="max-w-6xl mx-auto px-4 pt-4 md:pt-6">
                <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
                        <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
                    </svg>
                    Back to Home
                </button>
            </div>

            {/* Hero Header */}
            <div className="text-center mt-4 md:mt-10 mb-10 md:mb-16 max-w-4xl mx-auto px-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider mb-3 md:mb-5 border border-indigo-100 dark:border-indigo-800">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    The People Behind MedRussia
                </div>
                <h1 className="text-3xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-3 md:mb-5">
                    Meet Our <span className="text-indigo-600 dark:text-indigo-400">Team</span>
                </h1>
                <p className="text-sm md:text-xl text-slate-600 dark:text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
                    Real students and mentors who've been through the journey. We don't just guide — we've walked the same path.
                </p>
            </div>

            {/* Stats Bar */}
            <div className="max-w-4xl mx-auto mb-10 md:mb-16 px-4">
                <div className="bg-slate-900 dark:bg-black rounded-2xl md:rounded-3xl p-5 md:p-8 grid grid-cols-3 gap-4 md:gap-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
                    <div>
                        <div className="text-2xl md:text-4xl font-black text-white mb-1">{teamMembers.length}+</div>
                        <div className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Team Members</div>
                    </div>
                    <div>
                        <div className="text-2xl md:text-4xl font-black text-white mb-1">600+</div>
                        <div className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Students Helped</div>
                    </div>
                    <div>
                        <div className="text-2xl md:text-4xl font-black text-white mb-1">50+</div>
                        <div className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Universities</div>
                    </div>
                </div>
            </div>

            {/* Team Grid */}
            <div className="max-w-6xl mx-auto px-4 mb-16 md:mb-24">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {loading ? (
                        <div className="col-span-full text-center py-20 text-slate-400">Loading team...</div>
                    ) : (
                        teamMembers.map((member, index) => (
                            <TeamMemberCard key={member.id} member={member} index={index} />
                        ))
                    )}
                </div>
            </div>

            {/* Join CTA */}
            <div className="max-w-3xl mx-auto px-4 mb-16 md:mb-24">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl md:rounded-[2.5rem] p-8 md:p-12 text-center text-white relative overflow-hidden">
                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
                    <div className="relative z-10">
                        <h2 className="text-xl md:text-3xl font-black mb-2 md:mb-4">Want to Join Our Mission?</h2>
                        <p className="text-indigo-200 font-medium text-sm md:text-lg mb-6 md:mb-8 max-w-lg mx-auto">
                            If you're an Indian student studying MBBS in Russia and want to help future doctors, we'd love to hear from you.
                        </p>
                        <a
                            href="https://wa.me/917375017401?text=Hello%20Amit%20Sir,%20I%20would%20like%20to%20join%20the%20MedRussia%20team."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 px-6 py-3 md:px-8 md:py-4 bg-white text-indigo-700 font-black rounded-xl md:rounded-2xl text-sm md:text-lg hover:bg-indigo-50 transition-all shadow-xl hover:-translate-y-1 active:translate-y-0"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-600">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                            Reach Out on WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
