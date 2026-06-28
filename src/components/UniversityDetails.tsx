import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DETAILED_UNIVERSITIES } from '../constants/universities';

export const UniversityDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const uni = DETAILED_UNIVERSITIES.find(u => u.id.toString() === id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!uni) {
    return (
      <div className="pt-32 pb-20 text-center min-h-screen">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">University Not Found</h1>
        <button onClick={() => navigate('/universities')} className="text-[#f59e0b] hover:underline font-semibold">Back to Universities</button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <button onClick={() => navigate('/universities')} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors mb-6 font-semibold text-sm">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to List
        </button>
        
        <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-200">
          <div className="h-64 md:h-80 relative">
            <img src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt={uni.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="inline-block bg-[#f59e0b] text-amber-950 text-xs font-bold px-3 py-1 rounded-full mb-3 tracking-wide uppercase">
                {uni.ranking}
              </div>
              <h1 className="text-3xl md:text-5xl font-bold mb-2 leading-tight">{uni.name}</h1>
              <p className="text-white/80 flex items-center gap-1 text-sm md:text-base">
                <span className="material-symbols-outlined text-[18px]">location_on</span> {uni.location}
              </p>
            </div>
          </div>
          
          <div className="p-6 md:p-10">
            <div className="grid md:grid-cols-2 gap-8 mb-10">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Key Information</h3>
                <ul className="space-y-4">
                  <li className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Established</span>
                    <span className="font-semibold text-slate-900">{uni.established}</span>
                  </li>
                  <li className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Course Duration</span>
                    <span className="font-semibold text-slate-900">{uni.duration}</span>
                  </li>
                  <li className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Indian Mess</span>
                    <span className={`font-semibold ${uni.indian_mess ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {uni.indian_mess ? 'Available' : 'Not Available'}
                    </span>
                  </li>
                  <li className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Medium of Instruction</span>
                    <span className="font-semibold text-slate-900">English</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Fee Structure (Per Year)</h3>
                <ul className="space-y-4">
                  <li className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Tuition Fee</span>
                    <span className="font-semibold text-slate-900">₽ {uni.tuition_fee_rub.toLocaleString()}</span>
                  </li>
                  <li className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Hostel Fee</span>
                    <span className="font-semibold text-slate-900">₽ {uni.hostel_fee_rub.toLocaleString()}</span>
                  </li>
                  <li className="flex justify-between items-center text-base pt-2 border-t border-slate-100">
                    <span className="text-slate-900 font-bold">Total (Approx)</span>
                    <span className="font-bold text-emerald-600">₽ {uni.total_fee_rub.toLocaleString()}</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-10">
              <h3 className="text-base font-bold text-slate-900 mb-2">About University</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{uni.notes}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => navigate('/auth')} className="bg-[#f59e0b] text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-[#d97706] transition-colors shadow-lg shadow-amber-500/20 text-center">
                Apply to this University
              </button>
              <button onClick={() => navigate('/compare')} className="bg-white border border-slate-200 text-slate-700 px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors text-center">
                Compare with Others
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
