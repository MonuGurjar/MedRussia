import React, { useState, useEffect } from 'react';
import { platformCalculatorService } from '../services/platform/calculatorService';
import { platformUniversityService } from '../services/platform/universityService';
import { BudgetEstimateResponse, UniversitySummaryResponse } from '../types/platform';

interface MbbsBudgetCalculatorProps {
  onApplyWithBudget?: (uniName: string, budgetInr: number) => void;
}

export const MbbsBudgetCalculator: React.FC<MbbsBudgetCalculatorProps> = ({ onApplyWithBudget }) => {
  const [universities, setUniversities] = useState<UniversitySummaryResponse[]>([]);
  const [selectedUniId, setSelectedUniId] = useState<string>('');
  const [hostelType, setHostelType] = useState<'standard' | 'premium'>('standard');
  const [messIncluded, setMessIncluded] = useState<boolean>(true);
  const [monthlyMessInr, setMonthlyMessInr] = useState(12000);
  const [annualFlightsInr, setAnnualFlightsInr] = useState(40000);
  const [currencyMode, setCurrencyMode] = useState<'INR' | 'RUB' | 'USD'>('INR');
  const [platformEstimate, setPlatformEstimate] = useState<BudgetEstimateResponse | null>(null);
  const [isLoadingUnis, setIsLoadingUnis] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);

  // 1. Load canonical universities from Platform API
  useEffect(() => {
    let isMounted = true;
    const loadUniversities = async () => {
      try {
        setIsLoadingUnis(true);
        const data = await platformUniversityService.getUniversities({ page_size: 50 });
        if (isMounted && data.items && data.items.length > 0) {
          setUniversities(data.items);
          setSelectedUniId(data.items[0].id);
        }
      } catch (e) {
        console.warn('Failed to load universities for calculator:', e);
      } finally {
        if (isMounted) setIsLoadingUnis(false);
      }
    };
    loadUniversities();
    return () => { isMounted = false; };
  }, []);

  const selectedUni = universities.find((u) => u.id === selectedUniId) || universities[0];

  // 2. Fetch authoritative 6-year calculation from Platform API
  useEffect(() => {
    if (!selectedUniId) return;

    let isMounted = true;
    const fetchPlatformBudget = async () => {
      try {
        setIsCalculating(true);
        const estimate = await platformCalculatorService.estimateBudget({
          university_id: selectedUniId,
          meal_plan: messIncluded ? 'INDIAN_MESS' : 'SELF_COOKING',
          living_tier: hostelType === 'premium' ? 'COMFORT' : 'STANDARD',
          include_flight_budget: true
        });
        if (estimate && isMounted) {
          setPlatformEstimate(estimate);
        }
      } catch (err) {
        console.warn('Calculator estimate error from Platform API:', err);
      } finally {
        if (isMounted) setIsCalculating(false);
      }
    };
    fetchPlatformBudget();
    return () => { isMounted = false; };
  }, [selectedUniId, hostelType, messIncluded]);

  const rubToInrRate = platformEstimate?.hedged_forex_rate || 1.05;
  const rubToUsdRate = 0.011;

  // Breakdown calculations from platform estimate annual breakdown
  const annualBreakdowns = platformEstimate?.annual_breakdown || [];
  
  const totalTuitionRub = annualBreakdowns.reduce((acc, b) => acc + (b.tuition_fee || 0), 0);
  const totalTuitionInr = Math.round(totalTuitionRub * rubToInrRate);

  const totalHostelRub = annualBreakdowns.reduce((acc, b) => acc + (b.hostel_fee || 0), 0);
  const totalHostelInr = Math.round(totalHostelRub * rubToInrRate);

  const totalMessInr = annualBreakdowns.reduce((acc, b) => acc + (b.mess_fee || 0), 0);
  const totalFlightsInr = annualFlightsInr * 6;

  const totalMiscRub = annualBreakdowns.reduce((acc, b) => acc + (b.insurance_and_visa || 0) + (b.one_time_charges || 0), 0);
  const totalMiscInr = Math.round(totalMiscRub * rubToInrRate);

  const grandTotalInr = platformEstimate ? Math.round(platformEstimate.total_6_year_inr) : 0;
  const grandTotalRub = platformEstimate ? Math.round(platformEstimate.total_6_year_rub) : 0;
  const grandTotalUsd = platformEstimate ? Math.round(platformEstimate.total_6_year_usd) : 0;

  const formatAmount = (inrVal: number, rubVal: number) => {
    if (currencyMode === 'USD') return `$${Math.round(rubVal * rubToUsdRate).toLocaleString()}`;
    if (currencyMode === 'RUB') return `₽${Math.round(rubVal).toLocaleString()}`;
    return `₹${Math.round(inrVal).toLocaleString()}`;
  };

  const handleDownloadPdf = () => {
    if (!selectedUni) return;
    alert(`Downloading PDF Budget Report for ${selectedUni.name}...\nEstimated Total: ₹${grandTotalInr.toLocaleString()}`);
  };

  const handleShare = () => {
    if (!selectedUni) return;
    if (navigator.share) {
      navigator.share({
        title: `MBBS Fee Estimate - ${selectedUni.name}`,
        text: `Check out the 6-year MBBS budget estimate for ${selectedUni.name}: ₹${grandTotalInr.toLocaleString()}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`MBBS Fee Estimate for ${selectedUni.name}: ₹${grandTotalInr.toLocaleString()}`);
      alert("Estimate link copied to clipboard!");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 text-white p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full mb-2">
              <span className="material-symbols-outlined text-[14px]">tune</span> Official 6-Year Cost Planner
            </div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-[28px]">calculate</span>
              6-Year MBBS Complete Budget Estimator
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">100% Transparent Fee Calculator with Zero Hidden Charges</p>
          </div>

          {/* Currency Mode Selector */}
          <div className="flex items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto">
            {(['INR', 'RUB', 'USD'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setCurrencyMode(mode)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  currencyMode === mode
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode === 'INR' ? '₹ INR' : mode === 'RUB' ? '₽ RUB' : '$ USD'}
              </button>
            ))}
          </div>
        </div>

        {isLoadingUnis ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold">Loading official medical universities catalog...</p>
          </div>
        ) : universities.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <span className="material-symbols-outlined text-4xl text-slate-400">domain_disabled</span>
            <p className="text-sm font-bold text-slate-700">No universities currently available.</p>
            <p className="text-xs text-slate-400">Please check back later or contact admissions.</p>
          </div>
        ) : (
          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Controls Column */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="material-symbols-outlined text-amber-600 text-[20px]">tune</span>
                <h3 className="font-extrabold text-slate-900 text-sm">Parameters & Lifestyle Preferences</h3>
              </div>

              {/* University Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Select Russian University</label>
                <select
                  value={selectedUniId}
                  onChange={(e) => setSelectedUniId(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  {universities.map((uni) => (
                    <option key={uni.id} value={uni.id}>
                      {uni.name} ({uni.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Hostel Type */}
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Hostel Accommodation Type</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setHostelType('standard')}
                    className={`flex flex-col items-center justify-center text-center p-3 rounded-xl transition-all ${
                      hostelType === 'standard'
                        ? 'bg-amber-500/10 border border-amber-500/40 text-amber-900 font-extrabold shadow-2xs'
                        : 'hover:bg-slate-100 text-slate-600 font-medium'
                    }`}
                  >
                    <span className="text-xs font-bold">Standard</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">3-4 sharing, campus dorm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHostelType('premium')}
                    className={`flex flex-col items-center justify-center text-center p-3 rounded-xl transition-all ${
                      hostelType === 'premium'
                        ? 'bg-amber-500/10 border border-amber-500/40 text-amber-900 font-extrabold shadow-2xs'
                        : 'hover:bg-slate-100 text-slate-600 font-medium'
                    }`}
                  >
                    <span className="text-xs font-bold">Comfort (+50%)</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">2 sharing, attached bath</span>
                  </button>
                </div>
              </div>

              {/* Mess Inclusion Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-900">Include Indian Mess / Food</label>
                  <p className="text-[11px] text-slate-500">On-campus Indian mess facilities & monthly dining.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMessIncluded(!messIncluded)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    messIncluded ? 'bg-slate-950' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      messIncluded ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sliders */}
              {messIncluded && (
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Monthly Food / Indian Mess Expense</label>
                  <input
                    type="range"
                    min={8000}
                    max={20000}
                    step={1000}
                    value={monthlyMessInr}
                    onChange={(e) => setMonthlyMessInr(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs font-bold text-slate-500 mt-1">
                    <span>₹8,000</span>
                    <span className="text-amber-600 font-black">₹{monthlyMessInr.toLocaleString()}/mo</span>
                    <span>₹20,000</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Annual Round-Trip Flight Allowance</label>
                <input
                  type="range"
                  min={25000}
                  max={70000}
                  step={5000}
                  value={annualFlightsInr}
                  onChange={(e) => setAnnualFlightsInr(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs font-bold text-slate-500 mt-1">
                  <span>₹25,000</span>
                  <span className="text-amber-600 font-black">₹{annualFlightsInr.toLocaleString()}/yr</span>
                  <span>₹70,000</span>
                </div>
              </div>

              {/* Exchange Rate Disclaimer */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">info</span>
                <div>
                  <h5 className="text-xs font-bold text-amber-900">Official Platform Forex Benchmark</h5>
                  <p className="text-[11px] leading-relaxed text-amber-800 mt-0.5">
                    Hedged Rate: 1 RUB = ₹{rubToInrRate.toFixed(2)} INR. Official tuition and hostel fees are paid in Russian Rubles (RUB) upon arrival.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Complete Breakdown */}
            <div className="lg:col-span-6 bg-slate-50 rounded-3xl p-6 border border-slate-200 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-amber-600">receipt_long</span> 6-Year Cost Breakdown ({currencyMode})
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">6 Years Total</span>
                </div>

                {isCalculating ? (
                  <div className="py-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs font-semibold">Calculating canonical fee estimate...</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 text-xs font-medium text-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">school</span> 6 Years Tuition Fee
                      </span>
                      <span className="font-bold text-slate-900">{formatAmount(totalTuitionInr, totalTuitionRub)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">home</span> Hostel ({hostelType === 'premium' ? 'Comfort 2-Sharing' : 'Standard'})
                      </span>
                      <span className="font-bold text-slate-900">{formatAmount(totalHostelInr, totalHostelRub)}</span>
                    </div>

                    {messIncluded && (
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-slate-400">restaurant</span> Indian Mess / Food
                        </span>
                        <span className="font-bold text-slate-900">{formatAmount(totalMessInr, totalMessInr / rubToInrRate)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">flight_takeoff</span> Annual Flight Tickets
                      </span>
                      <span className="font-bold text-slate-900">{formatAmount(totalFlightsInr, totalFlightsInr / rubToInrRate)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">more_horiz</span> Visa, Insurance & Registration
                      </span>
                      <span className="font-bold text-slate-900">{formatAmount(totalMiscInr, totalMiscRub)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Display & Actions */}
              <div className="mt-6 pt-5 border-t-2 border-dashed border-slate-300">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estimated Total 6-Year Investment</p>
                    <p className="text-3xl font-black text-amber-600 tracking-tight mt-0.5">
                      {formatAmount(grandTotalInr, grandTotalRub)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Rubles Equivalent</p>
                    <p className="text-xs font-extrabold text-slate-800">~ ₽{grandTotalRub.toLocaleString()}</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 font-semibold mb-5">
                  Approx. ₹{Math.round(grandTotalInr / 6).toLocaleString()} per academic year
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span> Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">share</span> Share Plan
                  </button>
                </div>

                {onApplyWithBudget && selectedUni && (
                  <button
                    type="button"
                    onClick={() => onApplyWithBudget(selectedUni.name, grandTotalInr)}
                    className="w-full mt-3 p-4 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 cursor-pointer"
                  >
                    Apply to {selectedUni.name}
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
