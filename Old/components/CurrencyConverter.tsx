
import React, { useState, useEffect } from 'react';

interface CurrencyConverterProps {
  apiKey?: string;
}

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({ apiKey }) => {
  const [rubAmount, setRubAmount] = useState<string>('100');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use free API endpoint by default, or specific key if provided
        let url = 'https://api.exchangerate-api.com/v4/latest/RUB';
        if (apiKey && apiKey.trim() !== '') {
            url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/RUB`;
        }
        
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch");
        
        const data = await res.json();
        
        // Handle different API response structures (v4 vs v6)
        const rate = data.rates?.INR || data.conversion_rates?.INR;
        
        if (rate) {
          setExchangeRate(rate);
        } else {
            setError("Rate unavailable");
        }
      } catch (e) {
        console.error("Currency fetch error:", e);
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchExchangeRate();
  }, [apiKey]);

  const convertedAmount = exchangeRate && rubAmount && !isNaN(parseFloat(rubAmount))
    ? (parseFloat(rubAmount) * exchangeRate).toFixed(2) 
    : '---';

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl text-emerald-500 rotate-12 pointer-events-none">💱</div>
        <div className="relative z-10">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">💵</span> Currency Calc
            </h3>
            <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Russian Ruble (RUB)</label>
                    <input 
                    type="number" 
                    value={rubAmount} 
                    onChange={e => setRubAmount(e.target.value)} 
                    className="w-full bg-transparent text-xl font-black text-slate-900 dark:text-white outline-none" 
                    placeholder="100"
                    />
            </div>
            <div className="flex justify-center text-slate-400 text-xs font-bold">
                {loading ? 'Fetching Rate...' : '↓'}
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                    <label className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-1 block">Indian Rupee (INR)</label>
                    <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 truncate">
                    {loading ? 'Loading...' : `₹${convertedAmount}`}
                    </div>
            </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 text-center font-medium">
                {error ? 'Rate update failed' : `Live: 1 RUB = ₹${exchangeRate?.toFixed(2) || '...'}`}
            </p>
        </div>
    </div>
  );
};
