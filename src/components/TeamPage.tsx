import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TeamMember } from '../data/teamData';
import { getTeamMembers } from '../services/db';

const TeamMemberCard: React.FC<{ member: TeamMember; index: number }> = ({ member, index }) => (
  <div className="group bg-surface-container-lowest rounded-xl border border-outline-variant p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-500 hover:-translate-y-1 relative overflow-hidden" style={{ animationDelay: `${index * 80}ms` }}>
    <div className="relative z-10">
      <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-primary-container rounded-xl flex items-center justify-center text-3xl md:text-4xl mb-4 md:mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm overflow-hidden">
        {member.profileImage ? <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" /> : member.emoji}
      </div>
      <h3 className="text-base md:text-xl font-bold text-on-surface text-center mb-1">{member.name}</h3>
      <p className="text-primary text-label-md font-semibold text-center mb-3 md:mb-4">{member.role}</p>
      <div className="flex justify-center mb-3 md:mb-4">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 bg-primary-container text-on-primary-container rounded-lg text-label-sm font-semibold uppercase tracking-wider border border-outline-variant">{member.specialization}</span>
      </div>
      <p className="text-body-md text-on-surface-variant text-center leading-relaxed line-clamp-3 md:line-clamp-none">{member.bio}</p>
      {member.socials && (
        <div className="flex justify-center gap-2 mt-4 md:mt-5 pt-4 border-t border-outline-variant">
          {member.socials.whatsapp && <a href={member.socials.whatsapp} target="_blank" rel="noopener noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-[#d1fae5] text-[#059669] flex items-center justify-center hover:scale-110 transition-all border border-[#a7f3d0]" title="WhatsApp"><span className="material-symbols-outlined" style={{fontSize:'18px'}}>chat</span></a>}
          {member.socials.instagram && <a href={member.socials.instagram} target="_blank" rel="noopener noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-[#fce7f3] text-[#db2777] flex items-center justify-center hover:scale-110 transition-all border border-[#fbcfe8]" title="Instagram"><span className="material-symbols-outlined" style={{fontSize:'18px'}}>photo_camera</span></a>}
          {member.socials.youtube && <a href={member.socials.youtube} target="_blank" rel="noopener noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-[#fee2e2] text-[#dc2626] flex items-center justify-center hover:scale-110 transition-all border border-[#fecaca]" title="YouTube"><span className="material-symbols-outlined" style={{fontSize:'18px'}}>play_circle</span></a>}
        </div>
      )}
    </div>
  </div>
);

export const TeamPage: React.FC = () => {
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getTeamMembers().then(members => { setTeamMembers(members); setLoading(false); }).catch(() => setLoading(false)); }, []);

  return (
    <div className="fade-in-up overflow-x-hidden">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-4 md:pt-6">
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 px-4 py-2 text-label-md font-semibold text-on-surface-variant hover:text-primary bg-surface-container-lowest border border-outline-variant rounded-lg hover:border-primary/30 transition-all group shadow-sm">
          <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform" style={{fontSize:'18px'}}>arrow_back</span>Back to Home
        </button>
      </div>

      <div className="text-center mt-4 md:mt-10 mb-10 md:mb-16 max-w-4xl mx-auto px-margin-mobile">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container rounded-full text-label-sm font-semibold uppercase tracking-wider mb-5 border border-outline-variant"><span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>The People Behind MBBS Russia</div>
        <h1 className="text-3xl md:text-6xl font-bold text-on-surface tracking-tight leading-tight mb-3 md:mb-5">Meet Our <span className="text-primary">Team</span></h1>
        <p className="text-sm md:text-xl text-on-surface-variant font-medium max-w-2xl mx-auto leading-relaxed">Real students and mentors who've been through the journey. We don't just guide — we've walked the same path.</p>
      </div>

      <div className="max-w-4xl mx-auto mb-10 md:mb-16 px-margin-mobile">
        <div className="bg-primary rounded-xl p-5 md:p-8 grid grid-cols-3 gap-4 md:gap-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-secondary-container" />
          <div><div className="text-2xl md:text-4xl font-bold text-on-primary mb-1">{teamMembers.length}+</div><div className="text-label-sm text-on-primary/70 font-semibold uppercase tracking-wider">Team Members</div></div>
          <div><div className="text-2xl md:text-4xl font-bold text-on-primary mb-1">600+</div><div className="text-label-sm text-on-primary/70 font-semibold uppercase tracking-wider">Students Helped</div></div>
          <div><div className="text-2xl md:text-4xl font-bold text-on-primary mb-1">50+</div><div className="text-label-sm text-on-primary/70 font-semibold uppercase tracking-wider">Universities</div></div>
        </div>
      </div>

      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-16 md:mb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {loading ? <div className="col-span-full text-center py-20 text-on-surface-variant">Loading team...</div> : teamMembers.map((member, index) => <TeamMemberCard key={member.id} member={member} index={index} />)}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-margin-mobile mb-16 md:mb-24">
        <div className="bg-primary rounded-xl p-8 md:p-12 text-center text-on-primary relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl md:text-3xl font-bold mb-2 md:mb-4">Want to Join Our Mission?</h2>
            <p className="text-on-primary/70 font-medium text-sm md:text-lg mb-6 md:mb-8 max-w-lg mx-auto">If you're an Indian student studying MBBS in Russia and want to help future doctors, we'd love to hear from you.</p>
            <a href="https://wa.me/917375017401?text=Hello%20Amit%20Sir,%20I%20would%20like%20to%20join%20the%20MedRussia%20team." target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-6 py-3 md:px-8 md:py-4 bg-secondary-container text-on-secondary-container font-semibold rounded-lg text-sm md:text-lg hover:opacity-90 transition-all shadow-md hover:-translate-y-1 active:translate-y-0">
              <span className="material-symbols-outlined">chat</span>Reach Out on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
