
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { RUSSIAN_UNIVERSITIES, getUniversityData } from '../constants/universities';
import { Search } from 'lucide-react';

interface BudgetCalculatorProps {
  apiKey?: string;
}

export const BudgetCalculator: React.FC<BudgetCalculatorProps> = ({ apiKey }) => {
  // Inputs
  const [selectedUni, setSelectedUni] = useState<string>('');
  const [duration, setDuration] = useState<number>(6);
  
  // Yearly/Monthly Costs in RUB
  const [tuitionFee, setTuitionFee] = useState<number>(0);
  const [hostelFee, setHostelFee] = useState<number>(0);
  const [livingCostMonthly, setLivingCostMonthly] = useState<number>(15000); // Default ~15k RUB
  const [flightCostYearly, setFlightCostYearly] = useState<number>(45000); // Default ~45k RUB (~40k INR)
  const [otc, setOtc] = useState<number>(0); // One time charges

  // Currency
  const [exchangeRate, setExchangeRate] = useState<number>(0.92); // Default fallback
  const [loadingRate, setLoadingRate] = useState<boolean>(false);

  // Budget Suggestion State
  const [showBudgetFinder, setShowBudgetFinder] = useState(false);
  const [userBudgetInput, setUserBudgetInput] = useState('');
  const [suggestedUnis, setSuggestedUnis] = useState<{name: string, total: number}[]>([]);

  // Auto-fill data when university selected
  useEffect(() => {
    if (selectedUni) {
      const data = getUniversityData(selectedUni);
      if (data) {
        setTuitionFee(data.tuition_fee_rub);
        setHostelFee(data.hostel_fee_rub);
        // Estimate OTC based on typical values if not strictly defined, typically ~2000-3000 USD equivalent in RUB
        setOtc(200000); 
      }
    }
  }, [selectedUni]);

  // Fetch Live Rate
  useEffect(() => {
    const fetchRate = async () => {
      setLoadingRate(true);
      try {
        const url = apiKey && apiKey.trim() !== ''
            ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/RUB`
            : 'https://api.exchangerate-api.com/v4/latest/RUB';

        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            const rate = data.conversion_rates?.INR || data.rates?.INR;
            if (rate) setExchangeRate(rate);
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
  const totalTuition = tuitionFee * duration;
  const totalHostel = hostelFee * duration;
  const totalLiving = livingCostMonthly * 12 * duration;
  const totalFlights = flightCostYearly * duration;
  const totalOTC = otc;

  const grandTotalRUB = totalTuition + totalHostel + totalLiving + totalFlights + totalOTC;
  const grandTotalINR = Math.round(grandTotalRUB * exchangeRate);
  const grandTotalLakhs = grandTotalINR / 100000;

  const chartData = [
    { name: 'Tuition', value: totalTuition, color: '#4f46e5' }, // Indigo
    { name: 'Hostel', value: totalHostel, color: '#0ea5e9' }, // Sky
    { name: 'Living & Food', value: totalLiving, color: '#f59e0b' }, // Amber
    { name: 'Flights', value: totalFlights, color: '#ec4899' }, // Pink
    { name: 'Admin/OTC', value: totalOTC, color: '#10b981' }, // Emerald
  ];

  // Verdict Logic
  const getVerdict = (totalLakhs: number) => {
      if (totalLakhs < 18) return { label: 'High Risk', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/30', desc: 'Likely missing hidden costs.' };
      if (totalLakhs < 25) return { label: 'Tight', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/30', desc: 'Strict budget required.' };
      return { label: 'Comfortable', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/30', desc: 'Covers most expenses easily.' };
  };

  const verdict = getVerdict(grandTotalLakhs);

  // Suggest Universities Logic
  const handleFindUniversities = () => {
      if (!userBudgetInput) return;
      const budgetLakhs = parseFloat(userBudgetInput);
      if (isNaN(budgetLakhs)) return;

      const matches = RUSSIAN_UNIVERSITIES.map(uniName => {
          const data = getUniversityData(uniName);
          // Approximate total for 6 years based on current rate
          // Formula: (Tuition + Hostel + 1.8L Living + 45k Flight) * 6 + 2L OTC
          // Living: 15k RUB/mo * 12 = 180k RUB
          const yearlyBaseRub = data.tuition_fee_rub + data.hostel_fee_rub + 180000 + 45000;
          const totalRub = (yearlyBaseRub * 6) + 200000;
          const totalInrLakhs = (totalRub * exchangeRate) / 100000;
          
          return { name: uniName, total: totalInrLakhs };
      }).filter(u => u.total <= budgetLakhs + 2); // Allow +2L buffer

      setSuggestedUnis(matches.sort((a,b) => a.total - b.total));
  };

  return (
    <div className="animate-in zoom-in duration-300 relative">
        {/* Suggestion Modal */}
        {showBudgetFinder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative">
                    <button onClick={() => setShowBudgetFinder(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">✕</button>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">Find Universities by Budget</h3>
                    <div className="flex gap-2 mb-6">
                        <input 
                            type="number" 
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                            placeholder="Enter Max Budget (Lakhs)"
                            value={userBudgetInput}
                            onChange={e => setUserBudgetInput(e.target.value)}
                        />
                        <button onClick={handleFindUniversities} className="bg-indigo-600 text-white px-6 rounded-xl font-bold hover:bg-indigo-700 transition-colors text-sm">Find</button>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                        {suggestedUnis.length > 0 ? (
                            suggestedUnis.map((u, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-xs md:text-sm">{u.name}</span>
                                    <span className="font-black text-green-600 dark:text-green-400 text-xs">~₹{u.total.toFixed(1)}L</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-slate-400 text-xs py-4">Enter a budget to see options.</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-3xl md:rounded-[2.5rem] p-4 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-center mb-6 md:mb-10">
                <h3 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white mb-1 md:mb-2">Total MBBS Budget</h3>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">Estimate the complete cost to become a Doctor in Russia.</p>
                <button 
                    onClick={() => setShowBudgetFinder(true)}
                    className="mt-4 md:mt-6 inline-flex items-center gap-2 px-4 py-1.5 md:px-6 md:py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-200 dark:border-indigo-800"
                >
                    <Search size={12} /> Find Unis by Budget
                </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 md:gap-12">
                {/* Inputs Section */}
                <div className="space-y-4 md:space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-700">
                        <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3">Select University (Auto-fill)</label>
                        <select 
                            className="w-full px-4 py-2.5 md:px-5 md:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs md:text-sm"
                            value={selectedUni}
                            onChange={(e) => setSelectedUni(e.target.value)}
                        >
                            <option value="">-- Choose University --</option>
                            {RUSSIAN_UNIVERSITIES.map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                        <div>
                            <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2">Tuition / Year (RUB)</label>
                            <input type="number" value={tuitionFee} onChange={e => setTuitionFee(Number(e.target.value))} className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2">Hostel / Year (RUB)</label>
                            <input type="number" value={hostelFee} onChange={e => setHostelFee(Number(e.target.value))} className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-sky-500 text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2">Living / Month (RUB)</label>
                            <input type="number" value={livingCostMonthly} onChange={e => setLivingCostMonthly(Number(e.target.value))} className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2">Flight / Year (RUB)</label>
                            <input type="number" value={flightCostYearly} onChange={e => setFlightCostYearly(Number(e.target.value))} className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-pink-500 text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2">One Time Charges (RUB)</label>
                            <input type="number" value={otc} onChange={e => setOtc(Number(e.target.value))} className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2">Duration (Years)</label>
                            <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-slate-500 text-sm" />
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                <div className="bg-slate-900 dark:bg-black p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-600/30 rounded-full blur-3xl"></div>
                    
                    <div>
                        <div className="flex justify-between items-center mb-4 md:mb-6">
                            <h4 className="text-sm md:text-lg font-black uppercase tracking-wider text-slate-400">Total Projection</h4>
                            <div className="text-[9px] md:text-[10px] font-bold bg-white/10 px-2 py-1 rounded flex items-center gap-1">
                                {loadingRate ? <span className="animate-spin">⚡</span> : '●'} 1 RUB = ₹{exchangeRate.toFixed(2)}
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="text-xs md:text-sm text-slate-400 font-bold mb-1">Grand Total (6 Years)</div>
                            <div className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                                ₹ {grandTotalLakhs.toFixed(2)} Lakhs
                            </div>
                            <div className="text-xs md:text-sm font-medium text-slate-500 mt-2">
                                (₽ {grandTotalRUB.toLocaleString()})
                            </div>
                        </div>

                        {/* Verdict Layer */}
                        {grandTotalRUB > 0 && (
                            <div className={`flex items-center gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl mb-4 md:mb-6 ${verdict.bg}`}>
                                <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${verdict.color.replace('text', 'bg')}`}></div>
                                <div>
                                    <div className={`text-[10px] md:text-xs font-black uppercase ${verdict.color}`}>{verdict.label}</div>
                                    <div className={`text-[9px] md:text-[10px] font-bold ${verdict.color} opacity-80`}>{verdict.desc}</div>
                                </div>
                            </div>
                        )}

                        {/* Chart */}
                        <div className="h-32 md:h-40 w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={25}
                                        outerRadius={50}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value: number) => `₽ ${value.toLocaleString()}`}
                                        contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontSize: '12px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] md:text-xs font-bold mt-2">
                        {chartData.map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5 md:gap-2">
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" style={{backgroundColor: item.color}}></div>
                                <span className="text-slate-300">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
