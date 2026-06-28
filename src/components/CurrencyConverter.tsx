import React, { useState, useEffect } from 'react';

interface CurrencyConverterProps { apiKey?: string; }

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({ apiKey }) => {
  const [rubAmount, setRubAmount] = useState<string>('100');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      setLoading(true); setError(null);
      try {
        let url = 'https://api.exchangerate-api.com/v4/latest/RUB';
        if (apiKey && apiKey.trim() !== '') url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/RUB`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const rate = data.rates?.INR || data.conversion_rates?.INR;
        if (rate) setExchangeRate(rate);
        else setError("Rate unavailable");
      } catch (e) { setError("Network error"); } finally { setLoading(false); }
    };
    fetchExchangeRate();
  }, [apiKey]);

  const convertedAmount = exchangeRate && rubAmount && !isNaN(parseFloat(rubAmount)) ? (parseFloat(rubAmount) * exchangeRate).toFixed(2) : '---';

  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm relative overflow-hidden transition-shadow hover:shadow-md">
      <div className="absolute top-0 right-0 p-6 opacity-5 text-7xl text-primary rotate-12 pointer-events-none"><span className="material-symbols-outlined" style={{fontSize:'80px'}}>currency_exchange</span></div>
      <div className="relative z-10">
        <h3 className="text-headline-md text-primary mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">payments</span> Currency Calc
        </h3>
        <div className="space-y-4">
          <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant">
            <label className="text-label-sm text-on-surface-variant mb-1 block">Russian Ruble (RUB)</label>
            <input type="number" value={rubAmount} onChange={e => setRubAmount(e.target.value)} className="w-full bg-transparent text-xl font-bold text-on-surface outline-none" placeholder="100" />
          </div>
          <div className="flex justify-center text-on-surface-variant text-xs font-semibold">{loading ? 'Fetching Rate...' : '↓'}</div>
          <div className="bg-[#d1fae5] p-4 rounded-lg border border-[#a7f3d0]">
            <label className="text-label-sm text-[#065f46] mb-1 block">Indian Rupee (INR)</label>
            <div className="text-xl font-bold text-[#065f46] truncate">{loading ? 'Loading...' : `₹${convertedAmount}`}</div>
          </div>
        </div>
        <p className="text-label-sm text-on-surface-variant mt-4 text-center">{error ? 'Rate update failed' : `Live: 1 RUB = ₹${exchangeRate?.toFixed(2) || '...'}`}</p>
      </div>
    </div>
  );
};
