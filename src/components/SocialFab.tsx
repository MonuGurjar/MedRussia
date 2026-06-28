import React, { useState, useEffect, useRef } from 'react';

interface SocialFabProps { className?: string; onToggle?: (isOpen: boolean) => void; }

export const SocialFab: React.FC<SocialFabProps> = ({ className = "bottom-6 right-6", onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (onToggle) onToggle(isOpen); }, [isOpen, onToggle]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const links = [
    { id: 'instagram', label: 'Updates', icon: 'photo_camera', url: 'https://www.instagram.com/med_vlog716/', color: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600' },
    { id: 'youtube', label: 'Channel', icon: 'play_circle', url: 'https://youtube.com/@amit_gurjar-w1', color: 'bg-red-600' },
    { id: 'whatsapp', label: 'Support', icon: 'chat', url: 'https://wa.me/917375017401?text=Hello%20Amit%20Sir,%20I%20have%20a%20query%20regarding%20MBBS%20in%20Russia.', color: 'bg-[#25D366]' }
  ];

  return (
    <div ref={containerRef} className={`fixed z-50 flex flex-col items-end gap-4 ${className} fade-in-up`}>
      <div className={`flex flex-col items-end gap-3 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-90 pointer-events-none absolute bottom-4 right-0'}`}>
        {links.map((link, index) => (
          <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group" style={{ transitionDelay: `${index * 50}ms` }}>
            <span className="bg-white text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg border border-slate-200 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 whitespace-nowrap">{link.label}</span>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform ${link.color}`}>
              <span className="material-symbols-outlined">{link.icon}</span>
            </div>
          </a>
        ))}
      </div>
      <button onClick={() => setIsOpen(!isOpen)} className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 ${isOpen ? 'bg-slate-900 rotate-90 scale-95' : 'bg-[#25D366] rotate-0'}`} aria-label="Social Menu">
        <span className="material-symbols-outlined" style={{fontSize:'28px'}}>{isOpen ? 'close' : 'chat'}</span>
      </button>
    </div>
  );
};
