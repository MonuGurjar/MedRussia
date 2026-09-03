import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DETAILED_UNIVERSITIES, getUniversityImage, UniversityData } from '../constants/universities';
import { User } from '../types';

interface UniversityExplorerProps {
  onSelectUniversity?: (uni: UniversityData) => void;
  onApplyClick?: (uniName: string) => void;
  currentUser?: User | null;
}

export const UniversityExplorer: React.FC<UniversityExplorerProps> = ({ onSelectUniversity, onApplyClick, currentUser }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [comparedIds, setComparedIds] = useState<(number | string)[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const filters = ['All', 'NMC Recognized', 'Indian Mess', 'Budget (< 3.5L RUB)', 'Top Ranked'];

  const filteredUnis = useMemo(() => {
    return DETAILED_UNIVERSITIES.filter((uni) => {
      const matchesSearch = uni.name.toLowerCase().includes(search.toLowerCase()) || 
                            uni.location.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedFilter === 'NMC Recognized') return true; // All listed are NMC/WHO recognized
      if (selectedFilter === 'Indian Mess') return uni.indian_mess;
      if (selectedFilter === 'Budget (< 3.5L RUB)') return uni.tuition_fee_rub <= 350000;
      if (selectedFilter === 'Top Ranked') return uni.ranking?.includes('#1') || uni.ranking?.includes('Top') || uni.ranking?.includes('Ministry');
      return true;
    });
  }, [search, selectedFilter]);

  const toggleCompare = (id: number | string) => {
    setComparedIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const comparedUnis = useMemo(() => {
    return DETAILED_UNIVERSITIES.filter(u => comparedIds.includes(u.id));
  }, [comparedIds]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 font-sans">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            40+ Russian Medical Universities
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">100% NMC FMGL Compliant • Direct English Medium Admissions</p>
        </div>

        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search universities, cities, fees..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-slate-900"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedFilter === filter
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* University Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUnis.map((uni) => {
          const isCompared = comparedIds.includes(uni.id);
          const imageUrl = getUniversityImage(uni.id);
          return (
            <div key={uni.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="relative h-48 bg-slate-900 overflow-hidden">
                  <img src={imageUrl} alt={uni.name} className="w-full h-full object-cover opacity-90 transition-transform duration-500 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                  <span className="absolute top-3 right-3 bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2.5 py-1 rounded-md shadow-sm uppercase tracking-wider">
                    {uni.ranking || 'NMC Recognized'}
                  </span>
                  <div className="absolute bottom-3 left-3 text-white">
                    <p className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-amber-400">location_on</span> {uni.location}
                    </p>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1 leading-snug">{uni.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{uni.notes}</p>

                  <div className="relative overflow-hidden rounded-xl my-4">
                    <div className={`flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 ${!currentUser ? 'filter blur-[5px] select-none pointer-events-none' : ''}`}>
                      <div className="flex-1">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Annual Tuition</p>
                        <p className="text-sm font-black text-amber-600">₽{uni.tuition_fee_rub.toLocaleString()} / yr</p>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div className="flex-1">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Hostel Fee</p>
                        <p className="text-sm font-bold text-slate-800">₽{uni.hostel_fee_rub.toLocaleString()} / yr</p>
                      </div>
                    </div>
                    {!currentUser && (
                      <div
                        onClick={() => navigate('/auth')}
                        className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/5 hover:bg-slate-900/10 backdrop-blur-[2px] cursor-pointer transition-all rounded-xl"
                      >
                        <span className="px-2.5 py-1 bg-[#0f172a] hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1 transition-all">
                          <span className="material-symbols-outlined text-[13px] text-amber-400">lock</span> Login to View Fee
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-3">
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span> 100% English Medium
                    </span>
                    {uni.indian_mess && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-100">
                        <span className="material-symbols-outlined text-[14px]">restaurant</span> Indian Mess
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0 flex items-center justify-between border-t border-slate-100 mt-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={isCompared}
                    onChange={() => toggleCompare(uni.id)}
                    className="rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  Compare
                </label>

                <button
                  onClick={() => onApplyClick ? onApplyClick(uni.name) : (onSelectUniversity && onSelectUniversity(uni))}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Apply Now →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Compare Bar */}
      {comparedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-4 z-50 border border-slate-700 backdrop-blur-md">
          <span className="text-xs font-semibold">Comparing {comparedIds.length} of 4 universities</span>
          <button
            onClick={() => setComparedIds([])}
            className="text-xs text-slate-400 hover:text-white underline font-semibold"
          >
            Clear
          </button>
          <button
            onClick={() => setShowCompareModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-1.5 rounded-full text-xs font-extrabold transition-all"
          >
            Compare Now
          </button>
        </div>
      )}

      {/* Comparison Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setShowCompareModal(false)}
              className="absolute top-6 right-6 w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600">compare_arrows</span> University Side-by-Side Comparison
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {comparedUnis.map((u) => (
                <div key={u.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-extrabold text-slate-900 text-sm">{u.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">{u.location}</p>
                  <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs relative overflow-hidden">
                    <div className={!currentUser ? 'filter blur-[4px] select-none pointer-events-none' : ''}>
                      <p><span className="text-slate-400 font-semibold">Tuition:</span> <strong className="text-amber-600">₽{u.tuition_fee_rub.toLocaleString()}</strong></p>
                      <p><span className="text-slate-400 font-semibold">Hostel:</span> <strong>₽{u.hostel_fee_rub.toLocaleString()}</strong></p>
                    </div>
                    {!currentUser && (
                      <div onClick={() => navigate('/auth')} className="absolute inset-0 flex items-center justify-center bg-slate-900/5 cursor-pointer rounded-lg">
                        <span className="px-2 py-0.5 bg-[#0f172a] hover:bg-slate-800 text-white text-[10px] font-bold rounded shadow-sm flex items-center gap-1 transition-all">
                          <span className="material-symbols-outlined text-[12px] text-amber-400">lock</span> Login to View Fee
                        </span>
                      </div>
                    )}
                    <p><span className="text-slate-400 font-semibold">Indian Mess:</span> <strong>{u.indian_mess ? 'Yes ✓' : 'No'}</strong></p>
                    <p><span className="text-slate-400 font-semibold">Ranking:</span> <strong>{u.ranking}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
