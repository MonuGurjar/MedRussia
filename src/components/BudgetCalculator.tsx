import React, { useState, useEffect } from 'react';
import { RUSSIAN_UNIVERSITIES, getUniversityData } from '../constants/universities';

interface BudgetCalculatorProps {
  apiKey?: string;
}

export const BudgetCalculator: React.FC<BudgetCalculatorProps> = ({ apiKey }) => {
  const [selectedUni, setSelectedUni] = useState<string>('');
  const [hostelType, setHostelType] = useState<'standard' | 'premium'>('standard');
  const [messIncluded, setMessIncluded] = useState<boolean>(true);
  
  const [exchangeRateUsd, setExchangeRateUsd] = useState<number>(0.011); // Fallback RUB to USD
  const [loadingRate, setLoadingRate] = useState<boolean>(false);

  useEffect(() => {
    const fetchRate = async () => {
      setLoadingRate(true);
      try {
        const url = 'https://api.exchangerate-api.com/v4/latest/RUB';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.rates?.USD) setExchangeRateUsd(data.rates.USD);
        }
      } catch (e) {
        console.error("Rate fetch failed", e);
      } finally {
        setLoadingRate(false);
      }
    };
    fetchRate();
  }, [apiKey]);

  // Calculations
  const duration = 6;
  const uniData = selectedUni ? getUniversityData(selectedUni) : null;
  
  // Annual costs in RUB
  const annualTuition = uniData ? uniData.tuition_fee_rub : 408333; // ~2.45M total default
  const annualHostelBase = uniData ? uniData.hostel_fee_rub : 72500; // ~435k total default
  const annualHostel = hostelType === 'premium' ? annualHostelBase * 1.5 : annualHostelBase;
  const annualLiving = messIncluded ? 108333 : 80000; // ~650k total vs 480k total
  const totalMisc = 135000; // Flat over 6 years
  
  // Totals in RUB
  const totalTuitionRub = annualTuition * duration;
  const totalHostelRub = annualHostel * duration;
  const totalLivingRub = annualLiving * duration;
  
  const grandTotalRub = totalTuitionRub + totalHostelRub + totalLivingRub + totalMisc;
  const grandTotalUsd = Math.round(grandTotalRub * exchangeRateUsd);

  // Formatting helpers
  const formatUSD = (rub: number) => `$${Math.round(rub * exchangeRateUsd).toLocaleString()}`;
  const formatRUB = (rub: number) => `~ ${Math.round(rub).toLocaleString()} RUB`;

  return (
    <div className="fade-in-up w-full max-w-6xl mx-auto">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Estimate Your Journey</h3>
        <p className="text-slate-500 text-sm">Use this calculator to project your 6-year expenses including tuition, accommodation, and daily living in Russia.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 items-start">
        {/* Left Panel: Parameters */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-amber-100 text-amber-600 p-2 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </div>
            <h4 className="font-bold text-slate-800 text-lg">Parameters</h4>
          </div>

          <div className="space-y-8">
            {/* University Select */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select University</label>
              <select 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 font-medium transition-shadow appearance-none cursor-pointer"
                value={selectedUni}
                onChange={(e) => setSelectedUni(e.target.value)}
                style={{ backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg fill="none" stroke="%2394a3b8" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m6 9 6 6 6-6"/></svg>\')', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
              >
                <option value="">Choose an institution...</option>
                {RUSSIAN_UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <p className="text-xs text-slate-500 mt-2">Tuition fees vary significantly between institutions.</p>
            </div>

            {/* Hostel Type (Segmented Control) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Hostel Type</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                <button 
                  onClick={() => setHostelType('standard')}
                  className={`flex flex-col items-center justify-center text-center p-3 rounded-xl transition-all ${hostelType === 'standard' ? 'bg-[#ebf4ff] border border-blue-200 shadow-sm' : 'hover:bg-slate-100 border border-transparent'}`}
                >
                  <span className={`text-sm font-bold ${hostelType === 'standard' ? 'text-blue-700' : 'text-slate-600'}`}>Standard</span>
                  <span className={`text-[11px] mt-1 ${hostelType === 'standard' ? 'text-blue-600/80' : 'text-slate-500'}`}>3-4 sharing,<br/>basic amenities</span>
                </button>
                <button 
                  onClick={() => setHostelType('premium')}
                  className={`flex flex-col items-center justify-center text-center p-3 rounded-xl transition-all ${hostelType === 'premium' ? 'bg-[#ebf4ff] border border-blue-200 shadow-sm' : 'hover:bg-slate-100 border border-transparent'}`}
                >
                  <span className={`text-sm font-bold ${hostelType === 'premium' ? 'text-blue-700' : 'text-slate-600'}`}>Premium</span>
                  <span className={`text-[11px] mt-1 ${hostelType === 'premium' ? 'text-blue-600/80' : 'text-slate-500'}`}>2 sharing,<br/>attached bath</span>
                </button>
              </div>
            </div>

            {/* Mess Inclusion */}
            <div className="flex items-center justify-between py-2">
              <div className="pr-4">
                <label className="block text-sm font-bold text-slate-800 mb-1">Mess/Food Inclusion</label>
                <p className="text-xs text-slate-500">Indian/Local mess facilities on campus.</p>
              </div>
              <button 
                onClick={() => setMessIncluded(!messIncluded)}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${messIncluded ? 'bg-[#0f172a]' : 'bg-slate-200'}`}
              >
                <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${messIncluded ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Currency Fluctuation Note */}
            <div className="flex items-start gap-3 bg-amber-50/80 p-4 rounded-2xl border border-amber-100">
              <span className="material-symbols-outlined text-amber-500 text-[20px] shrink-0">info</span>
              <div>
                <h5 className="text-[13px] font-bold text-amber-800 mb-1">Currency Fluctuation</h5>
                <p className="text-[12px] leading-relaxed text-amber-700/80">Calculations are based on current exchange rates. Final fees are paid in Rubles (RUB) and may vary slightly upon enrollment.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Estimated Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-6 md:p-8 flex-1">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-slate-100 text-slate-600 p-2 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              </div>
              <h4 className="font-bold text-slate-800 text-lg">Estimated Breakdown (6 Years)</h4>
            </div>

            <div className="space-y-7">
              {/* Tuition */}
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">school</span>
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-slate-800 text-[15px]">Tuition Fees</h5>
                    <p className="text-[13px] text-slate-500 mt-0.5">Avg {formatUSD(annualTuition)} / year × 6</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-800 text-[15px]">{formatUSD(totalTuitionRub)}</div>
                    <div className="text-[12px] font-medium text-slate-400 mt-0.5">{formatRUB(totalTuitionRub)}</div>
                  </div>
                </div>
              </div>

              {/* Accommodation */}
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">home</span>
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-slate-800 text-[15px]">Accommodation</h5>
                    <p className="text-[13px] text-slate-500 mt-0.5">{hostelType === 'premium' ? 'Premium' : 'Standard'} Hostel (~{formatUSD(annualHostel)} / year)</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-800 text-[15px]">{formatUSD(totalHostelRub)}</div>
                    <div className="text-[12px] font-medium text-slate-400 mt-0.5">{formatRUB(totalHostelRub)}</div>
                  </div>
                </div>
              </div>

              {/* Living & Mess */}
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">restaurant</span>
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-slate-800 text-[15px]">Living & Mess Expenses</h5>
                    <p className="text-[13px] text-slate-500 mt-0.5">Included (~{formatUSD(annualLiving)} / year)</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-800 text-[15px]">{formatUSD(totalLivingRub)}</div>
                    <div className="text-[12px] font-medium text-slate-400 mt-0.5">{formatRUB(totalLivingRub)}</div>
                  </div>
                </div>
              </div>

              {/* Misc */}
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">more_horiz</span>
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-slate-800 text-[15px]">Misc (Visa, Insurance, Medical)</h5>
                    <p className="text-[13px] text-slate-500 mt-0.5">Estimated over 6 years</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-800 text-[15px]">{formatUSD(totalMisc)}</div>
                    <div className="text-[12px] font-medium text-slate-400 mt-0.5">{formatRUB(totalMisc)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Total */}
          <div className="bg-[#0f172a] p-6 md:p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/2 pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 relative z-10">
              <div>
                <h5 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">Total Estimated Cost (6 Years)</h5>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white tracking-tight">{formatUSD(grandTotalRub)}</span>
                  <span className="text-sm text-slate-400 font-bold">USD</span>
                </div>
              </div>
              <div className="text-left md:text-right">
                <div className="text-[11px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Approximate in Rubles</div>
                <div className="text-[15px] font-bold text-slate-300">~ {grandTotalRub.toLocaleString()} RUB</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
              <button className="bg-amber-500 text-amber-950 font-bold py-3.5 rounded-2xl hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
                <span className="material-symbols-outlined text-[20px]">download</span>
                Download PDF
              </button>
              <button className="bg-transparent border-2 border-slate-700 text-white font-bold py-3.5 rounded-2xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[20px]">share</span>
                Share Estimate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
