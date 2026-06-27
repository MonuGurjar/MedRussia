
import React, { useState, useRef, useEffect } from 'react';
import { saveFeedback } from '../services/db';
import { RUSSIAN_UNIVERSITIES } from '../constants/universities';

interface FeedbackFormProps {
  onSuccess: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    university: '',
    currentStatus: '12th Standard' as any,
    targetUniversity: '',
    budget: '',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredUniversities = RUSSIAN_UNIVERSITIES.filter(uni => 
    uni.toLowerCase().includes(formData.targetUniversity.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
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
      
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          university: '',
          currentStatus: '12th Standard',
          targetUniversity: '',
          budget: '',
          message: '',
        });
      }, 5000);
    } catch (err) {
      console.error(err);
      alert('Error saving your data. It has been saved locally, but cloud sync failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-400";
  const labelClasses = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4 animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto text-3xl">
          ✓
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Spasibo! (Thank You!)</h3>
        <p className="text-slate-600 dark:text-slate-300">Your feedback has been recorded and synced. I will get back to you soon.</p>
        <button 
          onClick={() => setSubmitted(false)}
          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline mt-4"
        >
          Send another response
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>Full Name</label>
          <input
            required
            type="text"
            className={inputClasses}
            placeholder="Aarav Sharma"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClasses}>Email Address</label>
          <input
            required
            type="email"
            className={inputClasses}
            placeholder="aarav@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>WhatsApp Number</label>
          <input
            required
            type="tel"
            className={inputClasses}
            placeholder="+91 98765-43210"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClasses}>Current University/School</label>
          <input
            type="text"
            className={inputClasses}
            placeholder="Name of your institution"
            value={formData.university}
            onChange={(e) => setFormData({ ...formData, university: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className={labelClasses}>Current Status</label>
        <select
          className={inputClasses}
          value={formData.currentStatus}
          onChange={(e) => setFormData({ ...formData, currentStatus: e.target.value as any })}
        >
          <option>12th Standard</option>
          <option>NEET Aspirant</option>
          <option>Dropper</option>
          <option>Currently in Russia</option>
          <option>Other</option>
        </select>
      </div>

      <div className="relative" ref={dropdownRef}>
        <label className={labelClasses}>Which university are you interested in?</label>
        <input
          type="text"
          className={inputClasses}
          placeholder="Type to search e.g. Kazan, Sechenov..."
          value={formData.targetUniversity}
          onFocus={() => setIsDropdownOpen(true)}
          onChange={(e) => {
            setFormData({ ...formData, targetUniversity: e.target.value });
            setIsDropdownOpen(true);
          }}
        />
        {isDropdownOpen && filteredUniversities.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredUniversities.map((uni, idx) => (
              <div
                key={idx}
                className="px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 cursor-pointer text-sm text-slate-700 dark:text-slate-200 transition-colors"
                onClick={() => {
                  setFormData({ ...formData, targetUniversity: uni });
                  setIsDropdownOpen(false);
                }}
              >
                {uni}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className={labelClasses}>Your budget for 6 years (₹)</label>
        <input
          type="text"
          className={inputClasses}
          placeholder="e.g. 25 - 30 Lakhs"
          value={formData.budget}
          onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
        />
      </div>

      <div>
        <label className={labelClasses}>Message or Specific Questions</label>
        <textarea
          required
          rows={4}
          className={inputClasses}
          placeholder="Tell me what information you are looking for..."
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-indigo-200 dark:hover:shadow-none active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Sending...
          </>
        ) : (
          'Send My Question'
        )}
      </button>
      
      <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
        By continuing, you agree to our Terms and Privacy Policy.
      </p>
    </form>
  );
};
