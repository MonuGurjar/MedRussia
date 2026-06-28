import React, { useState, useRef, useEffect } from 'react';
import { saveFeedback } from '../services/db';
import { RUSSIAN_UNIVERSITIES } from '../constants/universities';

interface FeedbackFormProps { onSuccess: () => void; }

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', university: '', currentStatus: '12th Standard' as any, targetUniversity: '', budget: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredUniversities = RUSSIAN_UNIVERSITIES.filter(uni => uni.toLowerCase().includes(formData.targetUniversity.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await saveFeedback(formData);
      setSubmitted(true);
      onSuccess();
      setTimeout(() => { setSubmitted(false); setFormData({ name: '', email: '', phone: '', university: '', currentStatus: '12th Standard', targetUniversity: '', budget: '', message: '' }); }, 5000);
    } catch (err) { console.error(err); alert('Error saving your data.'); } finally { setIsSubmitting(false); }
  };

  const inputCls = "w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-outline text-body-md";
  const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1";

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4 fade-in-up">
        <div className="w-16 h-16 bg-[#d1fae5] text-[#059669] rounded-full flex items-center justify-center mx-auto"><span className="material-symbols-outlined" style={{fontSize:'32px'}}>check_circle</span></div>
        <h3 className="text-headline-md text-on-surface">Spasibo! (Thank You!)</h3>
        <p className="text-body-md text-on-surface-variant">Your feedback has been recorded and synced. I will get back to you soon.</p>
        <button onClick={() => setSubmitted(false)} className="text-primary font-semibold hover:underline mt-4">Send another response</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className={labelCls}>Full Name</label><input required type="text" className={inputCls} placeholder="Aarav Sharma" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
        <div><label className={labelCls}>Email Address</label><input required type="email" className={inputCls} placeholder="aarav@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className={labelCls}>WhatsApp Number</label><input required type="tel" className={inputCls} placeholder="+91 98765-43210" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
        <div><label className={labelCls}>Current University/School</label><input type="text" className={inputCls} placeholder="Name of your institution" value={formData.university} onChange={(e) => setFormData({ ...formData, university: e.target.value })} /></div>
      </div>
      <div><label className={labelCls}>Current Status</label><select className={inputCls} value={formData.currentStatus} onChange={(e) => setFormData({ ...formData, currentStatus: e.target.value as any })}><option>12th Standard</option><option>NEET Aspirant</option><option>Dropper</option><option>Currently in Russia</option><option>Other</option></select></div>
      <div className="relative" ref={dropdownRef}>
        <label className={labelCls}>Which university are you interested in?</label>
        <input type="text" className={inputCls} placeholder="Type to search e.g. Kazan, Sechenov..." value={formData.targetUniversity} onFocus={() => setIsDropdownOpen(true)} onChange={(e) => { setFormData({ ...formData, targetUniversity: e.target.value }); setIsDropdownOpen(true); }} />
        {isDropdownOpen && filteredUniversities.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredUniversities.map((uni, idx) => (<div key={idx} className="px-4 py-2 hover:bg-surface-container-low cursor-pointer text-body-md text-on-surface transition-colors" onClick={() => { setFormData({ ...formData, targetUniversity: uni }); setIsDropdownOpen(false); }}>{uni}</div>))}
          </div>
        )}
      </div>
      <div><label className={labelCls}>Your budget for 6 years (₹)</label><input type="text" className={inputCls} placeholder="e.g. 25 - 30 Lakhs" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} /></div>
      <div><label className={labelCls}>Message or Specific Questions</label><textarea required rows={4} className={inputCls} placeholder="Tell me what information you are looking for..." value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} /></div>
      <button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary-container text-on-primary font-semibold py-3 px-6 rounded-lg transition-all shadow-sm active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {isSubmitting ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Sending...</>) : ('Send My Question')}
      </button>
      <p className="text-center text-label-sm text-outline font-medium">By continuing, you agree to our Terms and Privacy Policy.</p>
    </form>
  );
};
