import React, { useState, useEffect } from 'react';
import { RUSSIAN_UNIVERSITIES, getUniversityData, UniversityData } from '../constants/universities';
import { getSettings } from '../services/settings';

const StickyCell: React.FC<{ children: React.ReactNode; className?: string; isHeader?: boolean }> = ({ children, className = "", isHeader = false }) => (
  <div className={`sticky left-0 z-20 flex items-center justify-start pl-2 pr-1 md:pl-4 md:pr-2 border-r border-outline-variant ${className} ${isHeader ? 'z-30' : ''}`}>{children}</div>
);

const DataCell: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`flex items-center justify-end px-2 py-2 md:px-4 md:py-3 border-r border-outline-variant/30 last:border-none min-w-[140px] md:min-w-[200px] ${className}`}>{children}</div>
);

export const UniversityCompare: React.FC = () => {
  const [selectedUniversities, setSelectedUniversities] = useState<(string | null)[]>([null, null]);
  const [exchangeRate, setExchangeRate] = useState<number>(0.92);
  const [isRateLive, setIsRateLive] = useState(false);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const settings = await getSettings();
        const apiKey = settings?.currencyConverter?.apiKey;
        const url = apiKey && apiKey.trim() !== '' ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/RUB` : 'https://api.exchangerate-api.com/v4/latest/RUB';
        const res = await fetch(url);
        if (res.ok) { const data = await res.json(); const rate = data.conversion_rates?.INR || data.rates?.INR; if (rate) { setExchangeRate(rate); setIsRateLive(true); } }
      } catch (e) { console.error("Failed to fetch live rate", e); }
    };
    fetchRate();
  }, []);

  const handleAddSlot = () => { if (selectedUniversities.length < 4) setSelectedUniversities([...selectedUniversities, null]); else alert("Maximum 4 universities allowed for comparison."); };
  const handleRemoveSlot = (index: number) => { if (selectedUniversities.length > 2) { const n = [...selectedUniversities]; n.splice(index, 1); setSelectedUniversities(n); } else handleUpdateSlot(index, ""); };
  const handleUpdateSlot = (index: number, value: string) => { const n = [...selectedUniversities]; n[index] = value === "" ? null : value; setSelectedUniversities(n); };

  const comparisonData: (UniversityData | null)[] = selectedUniversities.map(name => name ? getUniversityData(name) : null);

  const formatFee = (amount: number) => {
    if (amount === 0) return <span className="text-label-sm text-on-surface-variant italic">Contact for info</span>;
    const inrVal = Math.round(amount * exchangeRate);
    return (
      <div className="flex flex-col items-end group cursor-help w-full" title={`Live Rate: 1 RUB = ${exchangeRate.toFixed(2)} INR`}>
        <span className="font-semibold text-on-surface text-xs md:text-sm">₽ {amount.toLocaleString()}</span>
        <div className={`flex items-center gap-1 text-[9px] md:text-[10px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5 ${isRateLive ? 'text-[#059669] bg-[#d1fae5]' : 'text-on-surface-variant bg-surface-container-low'}`}>
          {isRateLive && <span className="text-[8px] md:text-[9px]">⚡</span>}<span>₹ {inrVal.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  const renderRow = (label: string, renderValue: (data: UniversityData | null, idx: number) => React.ReactNode, isEven: boolean) => (
    <>
      <StickyCell className={`${isEven ? 'bg-surface/95' : 'bg-surface-container-lowest/95'} backdrop-blur-sm`}>
        <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide">{label}</span>
      </StickyCell>
      {comparisonData.map((data, idx) => (<DataCell key={`${label}-${idx}`} className={isEven ? 'bg-surface' : 'bg-surface-container-lowest'}>{renderValue(data, idx)}</DataCell>))}
    </>
  );

  return (
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-6 md:py-8 fade-in-up pb-32">
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-xl md:text-4xl font-bold text-on-surface mb-1 md:mb-2">University Compare</h2>
        <p className="text-body-md text-on-surface-variant max-w-md mx-auto">Compare fees, rankings, and facilities side-by-side.</p>
      </div>
      <div className="flex justify-center mb-6 md:mb-8 px-4">
        <button onClick={handleAddSlot} disabled={selectedUniversities.length >= 4} className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-on-primary px-6 md:px-8 py-3 rounded-lg font-semibold text-label-md hover:bg-primary-container transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
          <span className="material-symbols-outlined" style={{fontSize:'18px'}}>add</span>Add University
        </button>
      </div>
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-md overflow-hidden relative">
        <div className="overflow-x-auto custom-scrollbar">
          <div className="grid" style={{ gridTemplateColumns: `100px repeat(${selectedUniversities.length}, minmax(140px, 1fr))` }}>
            <StickyCell isHeader className="bg-surface-container-low/95 border-b border-outline-variant h-16 md:h-20">
              <span className="text-label-sm text-on-surface-variant uppercase tracking-widest font-semibold">Select University</span>
            </StickyCell>
            {selectedUniversities.map((selected, idx) => (
              <div key={`header-${idx}`} className="bg-surface-container-low p-2 md:p-3 border-b border-r border-outline-variant last:border-r-0 relative flex items-center h-16 md:h-20">
                {idx > 1 && <button onClick={() => handleRemoveSlot(idx)} className="absolute top-1 right-1 md:top-2 md:right-2 w-4 h-4 md:w-5 md:h-5 bg-surface-container text-on-surface-variant rounded-full flex items-center justify-center text-[8px] md:text-[10px] font-bold hover:bg-error hover:text-on-error transition-colors z-10">✕</button>}
                <select className="w-full bg-transparent outline-none font-semibold text-on-surface text-label-sm md:text-body-md appearance-none whitespace-pre-wrap leading-tight" value={selected || ""} onChange={(e) => handleUpdateSlot(idx, e.target.value)}>
                  <option value="">-- Add University --</option>
                  {RUSSIAN_UNIVERSITIES.map(uni => (<option key={uni} value={uni} disabled={selectedUniversities.includes(uni) && selected !== uni}>{uni}</option>))}
                </select>
              </div>
            ))}
            {renderRow("Ranking", (data) => <span className="font-bold text-primary text-xs md:text-sm">{data ? data.ranking : '-'}</span>, false)}
            {renderRow("Location", (data) => <span className="font-medium text-label-sm md:text-body-md text-on-surface-variant text-right">{data ? data.location : '-'}</span>, true)}
            {renderRow("Founded", (data) => <span className="font-medium text-label-sm md:text-body-md text-on-surface-variant">{data ? data.established : '-'}</span>, false)}
            {renderRow("Duration", (data) => <span className="font-semibold text-label-sm md:text-body-md text-on-surface">{data ? data.duration : '-'}</span>, true)}
            {renderRow("Tuition (Yr)", (data) => data ? formatFee(data.tuition_fee_rub) : <span className="text-outline">-</span>, false)}
            {renderRow("Hostel (Yr)", (data) => data ? formatFee(data.hostel_fee_rub) : <span className="text-outline">-</span>, true)}
            {renderRow("Total / Year", (data) => data ? <div className="flex flex-col items-end"><span className="font-bold text-sm md:text-base text-[#059669]">₽ {data.total_fee_rub.toLocaleString()}</span><span className="text-label-sm text-on-surface-variant">approx.</span></div> : <span className="text-outline">-</span>, false)}
            {renderRow("Indian Mess", (data) => data ? (data.indian_mess ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#d1fae5] text-[#065f46] text-label-sm font-semibold uppercase">✓ Available</span> : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-error-container text-on-error-container text-label-sm font-semibold uppercase">✕ No</span>) : <span className="text-outline">-</span>, true)}
            {renderRow("Notes", (data) => <span className="text-label-sm leading-snug text-on-surface-variant text-right min-w-[120px] md:min-w-[180px]">{data ? data.notes : '-'}</span>, false)}
            {renderRow("Website", (data) => data ? (
              <a href={data.website || `https://www.google.com/search?q=${encodeURIComponent(data.name + " official website")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 md:gap-2 text-label-sm font-semibold text-primary hover:text-primary-container transition-colors bg-primary-container px-2 md:px-3 py-1 md:py-1.5 rounded-lg whitespace-nowrap">
                {data.website ? 'Official Site' : 'Search Site'}<span className="material-symbols-outlined" style={{fontSize:'12px'}}>open_in_new</span>
              </a>
            ) : <span className="text-outline">-</span>, true)}
          </div>
        </div>
      </div>
      <div className="mt-4 md:mt-6 text-center px-4">
        <p className="text-label-sm text-on-surface-variant leading-relaxed">* Fees are approximate. 1 RUB = {exchangeRate.toFixed(2)} INR (Live Rate). Check university website for official data.</p>
      </div>
    </div>
  );
};
