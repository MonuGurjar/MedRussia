import React, { useState } from 'react';
import { DETAILED_UNIVERSITIES } from '../constants/universities';

interface MbbsBudgetCalculatorProps {
  onApplyWithBudget?: (uniName: string, budgetInr: number) => void;
}

export const MbbsBudgetCalculator: React.FC<MbbsBudgetCalculatorProps> = ({ onApplyWithBudget }) => {
  const [selectedUniId, setSelectedUniId] = useState<number | string>(DETAILED_UNIVERSITIES[0].id);
  const [hostelType, setHostelType] = useState<'standard' | 'premium'>('standard');
  const [messIncluded, setMessIncluded] = useState<boolean>(true);
  const [monthlyMessInr, setMonthlyMessInr] = useState(12000);
  const [annualFlightsInr, setAnnualFlightsInr] = useState(40000);
  const [currencyMode, setCurrencyMode] = useState<'INR' | 'RUB' | 'USD'>('INR');

  const rubToInrRate = 1.05; // Approx 1 RUB = 1.05 INR
  const rubToUsdRate = 0.011; // Approx 1 RUB = 0.011 USD

  const selectedUni = DETAILED_UNIVERSITIES.find((u) => u.id === selectedUniId) || DETAILED_UNIVERSITIES[0];

  // Annual Base Costs in RUB
  const annualTuitionRub = selectedUni.tuition_fee_rub;
  const annualHostelBaseRub = selectedUni.hostel_fee_rub;
  const annualHostelRub = hostelType === 'premium' ? annualHostelBaseRub * 1.5 : annualHostelBaseRub;
  
  // 6-Year Calculations
  const duration = 6;
  const totalTuitionRub = annualTuitionRub * duration;
  const totalHostelRub = annualHostelRub * duration;
  
  const totalMessInr = messIncluded ? monthlyMessInr * 10 * duration : 0;
  const totalFlightsInr = annualFlightsInr * duration;
  const totalMiscRub = 135000; // Flat misc over 6 years (Visa, Insurance, Medical)

  // Total Calculations in INR
  const totalTuitionInr = Math.round(totalTuitionRub * rubToInrRate);
  const totalHostelInr = Math.round(totalHostelRub * rubToInrRate);
  const totalMiscInr = Math.round(totalMiscRub * rubToInrRate);
  
  const grandTotalInr = totalTuitionInr + totalHostelInr + totalMessInr + totalFlightsInr + totalMiscInr;
  const grandTotalRub = Math.round(grandTotalInr / rubToInrRate);
  const grandTotalUsd = Math.round(grandTotalRub * rubToUsdRate);

  const formatAmount = (inrVal: number, rubVal: number) => {
    if (currencyMode === 'USD') return `$${Math.round(rubVal * rubToUsdRate).toLocaleString()}`;
    if (currencyMode === 'RUB') return `₽${Math.round(rubVal).toLocaleString()}`;
    return `₹${Math.round(inrVal).toLocaleString()}`;
  };

  const handleDownloadPdf = () => {
    alert(`Downloading PDF Budget Report for ${selectedUni.name}...\nEstimated Total: ₹${grandTotalInr.toLocaleString()}`);
  };

  const handleShare = () => {
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
        {/* Header (New UI Gradient) */}
        <div className="bg-slate-950 text-white p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full mb-2">
              <span className="material-symbols-outlined text-[14px]">tune</span> Hybrid 6-Year Cost Planner
            </div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-[28px]">calculate</span>
              6-Year MBBS Complete Budget Estimator
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">100% Transparent Fee Calculator with Zero Hidden Consultancy Charges</p>
          </div>

          {/* Currency Mode Selector (Old UI Feature) */}
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

        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Controls Column (Old + New UI) */}
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
                {DETAILED_UNIVERSITIES.map((uni) => (
                  <option key={uni.id} value={uni.id}>
                    {uni.name} (₽{uni.tuition_fee_rub.toLocaleString()}/yr)
                  </option>
                ))}
              </select>
            </div>

            {/* Hostel Type (Old UI Feature) */}
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
                  <span className="text-[10px] text-slate-500 mt-0.5">3-4 sharing, basic amenities</span>
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
                  <span className="text-xs font-bold">Premium (+50%)</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">2 sharing, attached bath</span>
                </button>
              </div>
            </div>

            {/* Mess Inclusion Toggle (Old UI Feature) */}
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

            {/* Sliders (New UI Feature) */}
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
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Annual Round-Trip Flight Budget</label>
              <input
                type="range"
                min={30000}
                max={70000}
                step={5000}
                value={annualFlightsInr}
                onChange={(e) => setAnnualFlightsInr(Number(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer"
              />
              <div className="flex justify-between text-xs font-bold text-slate-500 mt-1">
                <span>₹30,000</span>
                <span className="text-slate-900 font-black">₹{annualFlightsInr.toLocaleString()}/yr</span>
                <span>₹70,000</span>
              </div>
            </div>

            {/* Currency Fluctuation Info Box (Old UI Feature) */}
            <div className="flex items-start gap-3 bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200">
              <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">info</span>
              <div>
                <h5 className="text-xs font-bold text-amber-900">Currency Fluctuation Note</h5>
                <p className="text-[11px] leading-relaxed text-amber-800 mt-0.5">
                  Calculations are updated dynamically. Official tuition and hostel fees are paid in Russian Rubles (RUB) upon arrival.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Complete Breakdown (Old + New UI Hybrid) */}
          <div className="lg:col-span-6 bg-slate-50 rounded-3xl p-6 border border-slate-200 flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-amber-600">receipt_long</span> 6-Year Cost Breakdown ({currencyMode})
                </h3>
                <span className="text-[11px] font-bold text-slate-500">6 Years Total</span>
              </div>

              {/* Items */}
              <div className="space-y-3.5 text-xs font-medium text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">school</span> 6 Years Tuition Fee
                  </span>
                  <span className="font-bold text-slate-900">{formatAmount(totalTuitionInr, totalTuitionRub)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">home</span> Hostel ({hostelType === 'premium' ? 'Premium 2-Sharing' : 'Standard'})
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
                    <span className="material-symbols-outlined text-[16px] text-slate-400">more_horiz</span> Visa, Insurance & Medical Registrations
                  </span>
                  <span className="font-bold text-slate-900">{formatAmount(totalMiscInr, totalMiscRub)}</span>
                </div>
              </div>
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

              {/* Action Buttons (Old + New UI Hybrid) */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => onApplyWithBudget && onApplyWithBudget(selectedUni.name, grandTotalInr)}
                  className="w-full text-center bg-slate-950 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  Apply With This Budget Plan →
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="py-2.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-amber-600">download</span> Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="py-2.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-600">share</span> Share Estimate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
