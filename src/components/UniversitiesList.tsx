import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformUniversityService } from '../services/platform/universityService';
import { DETAILED_UNIVERSITIES, getUniversityImage, UniversityData } from '../constants/universities';
import { User } from '../types';

interface UniversitiesListProps {
  currentUser?: User | null;
}

export const UniversitiesList: React.FC<UniversitiesListProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [universities, setUniversities] = useState<UniversityData[]>(DETAILED_UNIVERSITIES);

  useEffect(() => {
    let isMounted = true;
    const fetchFromPlatform = async () => {
      try {
        const response = await platformUniversityService.getUniversities({ page: 1, page_size: 100 });
        if (response?.items && response.items.length > 0 && isMounted) {
          const mapped: UniversityData[] = response.items.map((item, idx) => ({
            id: item.id,
            name: item.name,
            location: `${item.city}, Russia`,
            established: '1900s',
            tuition_fee_rub: 450000,
            hostel_fee_rub: 35000,
            total_fee_rub: 485000,
            duration: '6 Years',
            indian_mess: item.has_indian_mess,
            ranking: item.ranking_russia ? `#${item.ranking_russia} in Russia` : (item.ranking_world ? `#${item.ranking_world} Global` : '#1 in Russia'),
            notes: item.is_nmc_compliant ? 'NMC & WHO Compliant' : 'Approved'
          }));
          setUniversities(mapped);
        }
      } catch (_: any) {
        // Fallback gracefully to default catalog
      }
    };
    fetchFromPlatform();
    return () => { isMounted = false; };
  }, []);

  const filtered = universities.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pt-20 sm:pt-28 pb-16 sm:pb-20 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-3">All Russian Medical Universities</h1>
            <p className="text-slate-500 text-sm sm:text-lg">Explore all our partnered institutions for your MBBS journey.</p>
          </div>
          <input 
            type="text" 
            placeholder="Search universities..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#f59e0b] w-full md:w-64 text-sm shadow-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {filtered.map((uni) => (
            <div key={uni.id} className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
              <div className="h-40 relative overflow-hidden bg-slate-200 flex items-center justify-center shrink-0">
                {/* Fallback image */}
                <img src={getUniversityImage(uni.id)} alt={uni.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-slate-900 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">star</span> {(4.5 + (Number(uni.id) % 5 || 0) / 10).toFixed(1)}
                </div>
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-bold text-slate-900 text-[15px] mb-1 line-clamp-2">{uni.name}</h3>
                <p className="text-slate-500 text-xs flex items-center gap-1 mb-5 shrink-0">
                  <span className="material-symbols-outlined text-[14px]">location_on</span> {uni.location}
                </p>
                <div className="grid grid-cols-2 gap-2 mb-5 shrink-0">
                  <div className="border border-slate-100 bg-slate-50 rounded-lg p-2 relative overflow-hidden">
                    <div className="text-[10px] text-slate-400 font-bold tracking-wider mb-0.5">FEE/YR</div>
                    <div className={`text-xs font-semibold text-slate-800 ${!currentUser ? 'filter blur-[4px] select-none pointer-events-none' : ''}`}>
                      ₽ {uni.tuition_fee_rub.toLocaleString()}
                    </div>
                    {!currentUser && (
                      <div onClick={() => navigate('/auth')} className="absolute inset-0 flex items-center justify-center bg-slate-900/5 hover:bg-slate-900/10 cursor-pointer">
                        <span className="text-[9px] font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[10px] text-amber-500">lock</span> Login
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="border border-slate-100 bg-slate-50 rounded-lg p-2">
                    <div className="text-[10px] text-slate-400 font-bold tracking-wider mb-0.5">MEDIUM</div>
                    <div className="text-xs font-semibold text-slate-800">English</div>
                  </div>
                </div>
                <div className="mt-auto">
                  <button onClick={() => navigate('/university/' + uni.id)} className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            No universities found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};
