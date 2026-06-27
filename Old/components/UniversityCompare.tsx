
import React, { useState, useEffect } from 'react';
import { RUSSIAN_UNIVERSITIES, getUniversityData, UniversityData } from '../constants/universities';
import { getSettings } from '../services/settings';
import { ExternalLink } from 'lucide-react';

// Extract components to fix TS errors with inline component definitions
const StickyCell: React.FC<{ children: React.ReactNode; className?: string; isHeader?: boolean }> = ({ children, className = "", isHeader = false }) => (
  <div className={`sticky left-0 z-20 flex items-center justify-start pl-2 pr-1 md:pl-4 md:pr-2 border-r border-slate-100 dark:border-slate-800 ${className} ${isHeader ? 'z-30' : ''}`}>
      {children}
  </div>
);

const DataCell: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`flex items-center justify-end px-2 py-2 md:px-4 md:py-3 border-r border-slate-50 dark:border-slate-800/50 last:border-none min-w-[140px] md:min-w-[200px] ${className}`}>
      {children}
  </div>
);

export const UniversityCompare: React.FC = () => {
  // Initialize with 2 empty slots
  const [selectedUniversities, setSelectedUniversities] = useState<(string | null)[]>([null, null]);
  
  // Currency State
  const [exchangeRate, setExchangeRate] = useState<number>(0.92); // Default fallback
  const [isRateLive, setIsRateLive] = useState(false);

  useEffect(() => {
    const fetchRate = async () => {
        try {
            const settings = await getSettings();
            const apiKey = settings?.currencyConverter?.apiKey;
            
            // Use v6 if key exists (more reliable), else v4 public
            const url = apiKey && apiKey.trim() !== ''
                ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/RUB`
                : 'https://api.exchangerate-api.com/v4/latest/RUB';

            const res = await fetch(url);
            if(res.ok) {
                const data = await res.json();
                // Check structure for v4 (rates) or v6 (conversion_rates)
                const rate = data.conversion_rates?.INR || data.rates?.INR;
                if(rate) {
                    setExchangeRate(rate);
                    setIsRateLive(true);
                }
            }
        } catch (e) {
            console.error("Failed to fetch live rate", e);
        }
    };
    fetchRate();
  }, []);

  const handleAddSlot = () => {
    if (selectedUniversities.length < 4) {
      setSelectedUniversities([...selectedUniversities, null]);
    } else {
        alert("Maximum 4 universities allowed for comparison.");
    }
  };

  const handleRemoveSlot = (index: number) => {
    if (selectedUniversities.length > 2) {
      const newSlots = [...selectedUniversities];
      newSlots.splice(index, 1);
      setSelectedUniversities(newSlots);
    } else {
        // Just clear the slot if it's one of the last 2
        handleUpdateSlot(index, "");
    }
  };

  const handleUpdateSlot = (index: number, value: string) => {
    const newSlots = [...selectedUniversities];
    newSlots[index] = value === "" ? null : value;
    setSelectedUniversities(newSlots);
  };

  // Get data only for selected universities
  const comparisonData: (UniversityData | null)[] = selectedUniversities.map(name => 
    name ? getUniversityData(name) : null
  );

  // Helper to format currency (RUB) and live INR
  const formatFee = (amount: number) => {
    if (amount === 0) return <span className="text-[10px] md:text-xs text-slate-400 italic">Contact for info</span>;
    
    const inrVal = Math.round(amount * exchangeRate);
    
    return (
      <div className="flex flex-col items-end group cursor-help w-full" title={`Live Rate: 1 RUB = ${exchangeRate.toFixed(2)} INR`}>
        <span className="font-bold text-slate-700 dark:text-slate-200 text-xs md:text-sm">₽ {amount.toLocaleString()}</span>
        <div className={`flex items-center gap-1 text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 ${isRateLive ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
           {isRateLive && <span className="text-[8px] md:text-[9px]">⚡</span>}
           <span>₹ {inrVal.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  // Row definition for cleaner rendering
  const renderRow = (label: string, renderValue: (data: UniversityData | null, idx: number) => React.ReactNode, isEven: boolean) => (
    <>
      <StickyCell className={`${isEven ? 'bg-slate-50/95 dark:bg-slate-900/95' : 'bg-white/95 dark:bg-slate-800/95'} backdrop-blur-sm`}>
        <span className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      </StickyCell>
      {comparisonData.map((data, idx) => (
        <DataCell key={`${label}-${idx}`} className={isEven ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-800'}>
          {renderValue(data, idx)}
        </DataCell>
      ))}
    </>
  );

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-4 py-6 md:py-8 animate-in fade-in duration-500 pb-32">
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-xl md:text-4xl font-black text-slate-900 dark:text-white mb-1 md:mb-2">University Compare</h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">Compare fees, rankings, and facilities side-by-side.</p>
      </div>

      {/* Control Bar */}
      <div className="flex justify-center mb-6 md:mb-8 px-4">
          <button 
            onClick={handleAddSlot}
            disabled={selectedUniversities.length >= 4}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 md:px-8 py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>+</span> Add University
          </button>
      </div>

      {/* Comparison Table Container */}
      <div className="rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-xl overflow-hidden relative">
        <div className="overflow-x-auto custom-scrollbar">
            <div className="grid" style={{ gridTemplateColumns: `100px repeat(${selectedUniversities.length}, minmax(140px, 1fr))` }}>
                
                {/* Header Row: University Selectors */}
                <StickyCell isHeader className="bg-slate-100/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-700 h-16 md:h-20">
                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Select University</span>
                </StickyCell>
                {selectedUniversities.map((selected, idx) => (
                    <div key={`header-${idx}`} className="bg-slate-50 dark:bg-slate-900/50 p-2 md:p-3 border-b border-r border-slate-200 dark:border-slate-700 last:border-r-0 relative flex items-center h-16 md:h-20">
                        {idx > 1 && (
                            <button 
                                onClick={() => handleRemoveSlot(idx)}
                                className="absolute top-1 right-1 md:top-2 md:right-2 w-4 h-4 md:w-5 md:h-5 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-full flex items-center justify-center text-[8px] md:text-[10px] font-bold hover:bg-red-500 hover:text-white transition-colors z-10"
                            >
                                ✕
                            </button>
                        )}
                        <select 
                            className="w-full bg-transparent outline-none font-bold text-slate-900 dark:text-white text-[10px] md:text-sm appearance-none whitespace-pre-wrap leading-tight"
                            value={selected || ""}
                            onChange={(e) => handleUpdateSlot(idx, e.target.value)}
                        >
                            <option value="">-- Add University --</option>
                            {RUSSIAN_UNIVERSITIES.map(uni => (
                                <option key={uni} value={uni} disabled={selectedUniversities.includes(uni) && selected !== uni}>
                                    {uni}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}

                {/* Data Rows */}
                {renderRow("Ranking", (data) => (
                    <span className="font-black text-xs md:text-sm text-indigo-600 dark:text-indigo-400">{data ? data.ranking : '-'}</span>
                ), false)}

                {renderRow("Location", (data) => (
                    <span className="font-medium text-[10px] md:text-xs text-slate-600 dark:text-slate-300 text-right">{data ? data.location : '-'}</span>
                ), true)}

                {renderRow("Founded", (data) => (
                    <span className="font-medium text-[10px] md:text-xs text-slate-600 dark:text-slate-300">{data ? data.established : '-'}</span>
                ), false)}

                {renderRow("Duration", (data) => (
                    <span className="font-bold text-[10px] md:text-xs text-slate-700 dark:text-slate-200">{data ? data.duration : '-'}</span>
                ), true)}

                {renderRow("Tuition (Yr)", (data) => (
                    data ? formatFee(data.tuition_fee_rub) : <span className="text-slate-300">-</span>
                ), false)}

                {renderRow("Hostel (Yr)", (data) => (
                    data ? formatFee(data.hostel_fee_rub) : <span className="text-slate-300">-</span>
                ), true)}

                {renderRow("Total / Year", (data) => (
                    data ? (
                        <div className="flex flex-col items-end">
                            <span className="font-black text-sm md:text-base text-emerald-600 dark:text-emerald-400">₽ {data.total_fee_rub.toLocaleString()}</span>
                            <span className="text-[9px] md:text-[10px] font-medium text-slate-400">approx.</span>
                        </div>
                    ) : <span className="text-slate-300">-</span>
                ), false)}

                {renderRow("Indian Mess", (data) => (
                    data ? (
                        data.indian_mess ? 
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[9px] md:text-[10px] font-black uppercase">✓ Available</span> : 
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[9px] md:text-[10px] font-black uppercase">✕ No</span>
                    ) : <span className="text-slate-300">-</span>
                ), true)}

                {renderRow("Notes", (data) => (
                    <span className="text-[9px] md:text-[10px] leading-snug text-slate-500 dark:text-slate-400 text-right min-w-[120px] md:min-w-[180px]">{data ? data.notes : '-'}</span>
                ), false)}

                {/* New Website Row */}
                {renderRow("Website", (data) => (
                    data ? (
                        <a 
                            href={data.website || `https://www.google.com/search?q=${encodeURIComponent(data.name + " official website")}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 md:gap-2 text-[10px] md:text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors bg-indigo-50 dark:bg-indigo-900/20 px-2 md:px-3 py-1 md:py-1.5 rounded-lg whitespace-nowrap"
                        >
                            {data.website ? 'Official Site' : 'Search Site'}
                            <ExternalLink size={10} />
                        </a>
                    ) : <span className="text-slate-300">-</span>
                ), true)}

            </div>
        </div>
      </div>

      <div className="mt-4 md:mt-6 text-center px-4">
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            * Fees are approximate. 1 RUB = {exchangeRate.toFixed(2)} INR (Live Rate). Check university website for official data.
        </p>
      </div>
    </div>
  );
};
