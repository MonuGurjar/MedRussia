import React, { useState } from 'react';
import { askAiCounselor } from '../services/geminiAi';

export const AiEligibilityChecker: React.FC = () => {
  const [category, setCategory] = useState<'General / UR' | 'OBC' | 'SC' | 'ST'>('General / UR');
  const [physics, setPhysics] = useState(65);
  const [chemistry, setChemistry] = useState(62);
  const [biology, setBiology] = useState(70);
  const [neetScore, setNeetScore] = useState(285);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const evaluate = async () => {
    setIsEvaluating(true);
    const pcb = (physics + chemistry + biology) / 3;
    const minPcbRequired = category === 'General / UR' ? 50 : 40;
    const neetCutoff = category === 'General / UR' ? 137 : 107;
    const isCompliant = pcb >= minPcbRequired && neetScore >= neetCutoff;

    try {
      const prompt = `Evaluate MBBS eligibility for 12th PCB average ${pcb.toFixed(1)}% (Physics ${physics}%, Chemistry ${chemistry}%, Biology ${biology}%), NEET score ${neetScore}/720, Category ${category}. Is student eligible for MBBS in Russia under NMC Gazette guidelines?`;
      const aiAdvice = await askAiCounselor(prompt);

      setResult({
        isCompliant,
        pcbAggregate: pcb.toFixed(1),
        minPcbRequired,
        neetCutoff,
        aiAdvice
      });
    } catch (e) {
      setResult({
        isCompliant,
        pcbAggregate: pcb.toFixed(1),
        minPcbRequired,
        neetCutoff,
        aiAdvice: isCompliant ? "Student meets standard NMC 50% PCB & NEET qualification benchmarks." : "12th PCB aggregate or NEET score is below mandatory NMC cutoff criteria."
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-200">
            <span className="material-symbols-outlined text-amber-600 text-[24px]">auto_awesome</span>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">AI NMC Eligibility Evaluator</h2>
            <p className="text-xs text-slate-500 font-medium">Evaluates 12th PCB & NEET Scores against National Medical Commission FMGL Regulations</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Category (As per Caste Certificate)</label>
            <div className="grid grid-cols-4 gap-2">
              {(['General / UR', 'OBC', 'SC', 'ST'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    category === cat
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Physics (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={physics}
                onChange={(e) => setPhysics(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Chemistry (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={chemistry}
                onChange={(e) => setChemistry(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Biology (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={biology}
                onChange={(e) => setBiology(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">NEET Score (Out of 720)</label>
            <input
              type="number"
              min={0}
              max={720}
              value={neetScore}
              onChange={(e) => setNeetScore(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center text-slate-900"
            />
          </div>

          <button
            onClick={evaluate}
            disabled={isEvaluating}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-xl shadow-md transition-all text-xs uppercase tracking-wider"
          >
            {isEvaluating ? 'Analyzing Profile with Gemini AI...' : 'Evaluate MBBS Eligibility ⚡'}
          </button>
        </div>

        {result && (
          <div className={`mt-6 p-5 rounded-2xl border ${result.isCompliant ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex items-start gap-3">
              <span className={`material-symbols-outlined text-[28px] ${result.isCompliant ? 'text-emerald-600' : 'text-rose-600'}`}>
                {result.isCompliant ? 'verified' : 'warning'}
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  {result.isCompliant ? '100% NMC Compliant — Admission Eligible' : 'Eligibility Criteria Not Met'}
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  12th PCB Aggregate: <strong>{result.pcbAggregate}%</strong> (Min {result.minPcbRequired}% required) • 
                  NEET Cutoff: <strong>{result.neetCutoff}</strong>
                </p>
                {result.aiAdvice && (
                  <p className="text-xs text-slate-700 mt-3 pt-3 border-t border-slate-200/80 leading-relaxed font-medium">
                    {result.aiAdvice}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
