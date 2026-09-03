import React, { useState, useEffect } from 'react';
import { platformEligibilityService } from '../services/platform/eligibilityService';
import { EligibilityReportResponse } from '../types/platform';

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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [report, setReport] = useState<EligibilityReportResponse | null>(null);

  useEffect(() => {
    const savedScore = localStorage.getItem('mr_neet_score');
    const savedCat = localStorage.getItem('mr_category');
    const savedPcb = localStorage.getItem('mr_pcb_percentage');
    if (savedScore) setNeetScore(savedScore);
    if (savedCat) setCategory(savedCat);
    if (savedPcb) setPcbPercentage(savedPcb);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheck = async (e: React.FormEvent) => {
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
      return;
    }

    setIsLoading(true);
    try {
      const catLower = category.toLowerCase().includes('sc') || category.toLowerCase().includes('st') || category.toLowerCase().includes('obc')
        ? 'sc_st_obc'
        : (category.toLowerCase().includes('pwd') ? 'pwd' : 'general');

      const response = await platformEligibilityService.evaluateEligibility({
        physics_marks: pcbNum,
        chemistry_marks: pcbNum,
        biology_marks: pcbNum,
        english_passed: true,
        student_age: 18,
        category: catLower,
        neet_status: 'qualified',
        neet_score: scoreNum
      });
      setReport(response);
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to evaluate eligibility with Platform');
    } finally {
      setIsLoading(false);
    }
  };

  const isEligible = report ? report.is_eligible : false;

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
              <h3 className="font-bold text-base text-white">NMC Eligibility Check</h3>
              <p className="text-[11px] text-slate-300">Statutory FMGL 2021 Regulation Evaluation</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {!submitted ? (
            <form onSubmit={handleCheck} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  NEET Score (Out of 720)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 350"
                  value={neetScore}
                  onChange={(e) => setNeetScore(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-slate-900 text-sm font-semibold transition-all placeholder:text-slate-400"
                  min="0"
                  max="720"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-slate-900 text-sm font-semibold transition-all bg-white"
                >
                  <option value="General">General / UR (50% PCB)</option>
                  <option value="OBC">OBC (40% PCB)</option>
                  <option value="SC">SC (40% PCB)</option>
                  <option value="ST">ST (40% PCB)</option>
                  <option value="PwD">PwD (45% PCB)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  12th PCB Aggregate Marks (%)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 65"
                  value={pcbPercentage}
                  onChange={(e) => setPcbPercentage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-slate-900 text-sm font-semibold transition-all placeholder:text-slate-400"
                  min="0"
                  max="100"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    Evaluating on Platform...
                  </>
                ) : (
                  <>
                    <span>Evaluate Statutory Eligibility</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-2 space-y-4">
              <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${isEligible ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                <span className="material-symbols-outlined text-[36px]">
                  {isEligible ? 'check_circle' : 'cancel'}
                </span>
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900">
                  {isEligible ? 'Eligible for Russian MBBS' : 'Eligibility Criteria Not Met'}
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                  {report?.summary || (isEligible ? 'Your academic credentials meet the statutory NMC guidelines for study abroad.' : 'Your profile does not satisfy the minimum statutory benchmarks.')}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">12th PCB Percentage:</span>
                  <span className="font-bold text-slate-900">{report?.pcb_percentage ?? pcbPercentage}% (Required: {report?.pcb_cutoff_required ?? 50}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NEET Qualification:</span>
                  <span className={`font-bold ${report?.neet_passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {report?.neet_passed ? 'Qualified' : 'Pending / Required'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => { setSubmitted(false); onClose(); }}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
