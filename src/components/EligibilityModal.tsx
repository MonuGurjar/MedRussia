import React, { useState, useEffect } from 'react';

interface EligibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onLoginRedirect: (score: string, category: string, pcb: string) => void;
}

export const EligibilityModal: React.FC<EligibilityModalProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  onLoginRedirect
}) => {
  const [neetScore, setNeetScore] = useState<string>('');
  const [category, setCategory] = useState<string>('General');
  const [pcbPercentage, setPcbPercentage] = useState<string>('60');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const savedScore = localStorage.getItem('mr_neet_score');
    const savedCat = localStorage.getItem('mr_category');
    const savedPcb = localStorage.getItem('mr_pcb_percentage');
    if (savedScore) setNeetScore(savedScore);
    if (savedCat) setCategory(savedCat);
    if (savedPcb) setPcbPercentage(savedPcb);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const scoreNum = parseInt(neetScore, 10);
    const pcbNum = parseFloat(pcbPercentage);

    if (!neetScore || isNaN(scoreNum) || scoreNum < 0 || scoreNum > 720) {
      setErrorMsg('Please enter a valid NEET score between 0 and 720.');
      return;
    }

    if (isNaN(pcbNum) || pcbNum < 0 || pcbNum > 100) {
      setErrorMsg('Please enter a valid 12th PCB aggregate percentage (0 - 100%).');
      return;
    }

    setErrorMsg(null);

    // Save user selections
    localStorage.setItem('mr_neet_score', neetScore);
    localStorage.setItem('mr_category', category);
    localStorage.setItem('mr_pcb_percentage', pcbPercentage);

    if (!isAuthenticated) {
      onLoginRedirect(neetScore, category, pcbPercentage);
    } else {
      setSubmitted(true);
    }
  };

  // Eligibility Criteria:
  // General: NEET ~164 marks, 12th PCB >= 50%
  // OBC/SC/ST: NEET ~129 marks, 12th PCB >= 40%
  const scoreNum = parseInt(neetScore, 10) || 0;
  const pcbNum = parseFloat(pcbPercentage) || 0;
  const isReserved = ['OBC', 'SC', 'ST'].includes(category);
  const minNeetScore = isReserved ? 129 : 164;
  const minPcb = isReserved ? 40 : 50;

  const isEligible = scoreNum >= minNeetScore && pcbNum >= minPcb;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto fade-in-up">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        
        {/* Header bar */}
        <div className="bg-gradient-to-r from-slate-900 via-[#031835] to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight text-white">NEET Eligibility Checker</h3>
              <p className="text-slate-400 text-xs">NMC Guidelines for MBBS in Russia</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {!submitted ? (
            <form onSubmit={handleCheck} className="space-y-5">
              
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  1. Select Reservation Category
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['General', 'OBC', 'SC', 'ST'].map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                        category === cat
                          ? 'bg-[#1a365d] text-white border-[#1a365d] shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* NEET Score Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  2. NEET Score / Marks (Out of 720)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="720"
                    value={neetScore}
                    onChange={(e) => setNeetScore(e.target.value)}
                    placeholder="e.g. 240, 380, 520"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm font-semibold text-slate-900 bg-slate-50/50"
                  />
                  <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400">/ 720</span>
                </div>
              </div>

              {/* 12th PCB % */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  3. 12th PCB Aggregate (Physics + Chem + Biology %)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={pcbPercentage}
                    onChange={(e) => setPcbPercentage(e.target.value)}
                    placeholder="e.g. 55, 65, 75"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm font-semibold text-slate-900 bg-slate-50/50"
                  />
                  <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400">%</span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  {errorMsg}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  Check Eligibility & Match Universities
                </button>
              </div>

              {!isAuthenticated && (
                <p className="text-[11px] text-slate-500 text-center font-medium">
                  🔒 Note: You will be prompted to sign in / register to view your full eligibility report.
                </p>
              )}
            </form>
          ) : (
            /* Logged-in Result Report */
            <div className="space-y-5">
              <div className={`p-4 sm:p-5 rounded-2xl border ${
                isEligible 
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
                  : 'bg-amber-50/80 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[28px] shrink-0 text-emerald-600">
                    {isEligible ? 'check_circle' : 'info'}
                  </span>
                  <div>
                    <h4 className="font-extrabold text-base mb-1">
                      {isEligible ? '🎉 Eligible for MBBS in Russia' : '⚠️ Action Recommended'}
                    </h4>
                    <p className="text-xs leading-relaxed opacity-90">
                      {isEligible
                        ? `With a NEET Score of ${neetScore} (${category} category) and ${pcbPercentage}% in PCB, you meet all NMC guidelines for MBBS admission in Russia!`
                        : `Your NEET Score is ${neetScore}. The required qualifying cutoff for ${category} category is ${minNeetScore} marks and ${minPcb}% PCB.`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs py-1 border-b border-slate-200/80">
                  <span className="text-slate-500 font-semibold">Category:</span>
                  <span className="font-bold text-slate-900">{category}</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-200/80">
                  <span className="text-slate-500 font-semibold">NMC Cutoff Required:</span>
                  <span className="font-bold text-slate-900">{minNeetScore} Marks</span>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-500 font-semibold">12th PCB Minimum:</span>
                  <span className="font-bold text-slate-900">{minPcb}% (Your score: {pcbPercentage}%)</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSubmitted(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
                >
                  Recalculate
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1a365d] text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Explore Universities
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
