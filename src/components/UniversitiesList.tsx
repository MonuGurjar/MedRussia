import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DETAILED_UNIVERSITIES } from '../constants/universities';

export const UniversitiesList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = DETAILED_UNIVERSITIES.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.location.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="pt-28 pb-20 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">All Russian Medical Universities</h1>
            <p className="text-slate-500 text-lg">Explore all our partnered institutions for your MBBS journey.</p>
          </div>
          <input 
            type="text" 
            placeholder="Search universities..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#f59e0b] w-full md:w-64"
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((uni) => (
            <div key={uni.id} className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
              <div className="h-40 relative overflow-hidden bg-slate-200 flex items-center justify-center shrink-0">
                {/* Fallback image */}
                <img src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt={uni.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-slate-900 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">star</span> {(4.5 + (Number(uni.id) % 5) / 10).toFixed(1)}
                </div>
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-bold text-slate-900 text-[15px] mb-1 line-clamp-2">{uni.name}</h3>
                <p className="text-slate-500 text-xs flex items-center gap-1 mb-5 shrink-0">
                  <span className="material-symbols-outlined text-[14px]">location_on</span> {uni.location}
                </p>
                <div className="grid grid-cols-2 gap-2 mb-5 shrink-0">
                  <div className="border border-slate-100 bg-slate-50 rounded-lg p-2">
                    <div className="text-[10px] text-slate-400 font-bold tracking-wider mb-0.5">FEE/YR</div>
                    <div className="text-xs font-semibold text-slate-800">₽ {uni.tuition_fee_rub.toLocaleString()}</div>
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
