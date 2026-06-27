
import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, AlertTriangle } from 'lucide-react';
import { savePlatformFeedback } from '../services/db';

interface PlatformFeedbackModalProps {
    className?: string;
    trigger?: React.ReactNode;
}

export const PlatformFeedbackModal: React.FC<PlatformFeedbackModalProps> = ({ className, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    feedbackType: 'Feature suggestion',
    message: '',
    email: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim()) return;

    setIsSubmitting(true);
    try {
      const activeUser = localStorage.getItem('mr_active_user');
      const role = activeUser ? 'user' : 'guest';

      await savePlatformFeedback({
        feedbackType: formData.feedbackType as any,
        message: formData.message,
        email: formData.email,
        userRole: role
      });

      setFormData({ feedbackType: 'Feature suggestion', message: '', email: '' });
      setIsOpen(false);
      alert("Thank you! Your feedback helps us improve MedRussia.");
    } catch (error) {
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Default positioning if no className/trigger provided
  const defaultClass = "fixed bottom-20 left-4 z-[60] md:bottom-8 md:left-8";
  const buttonClass = className || defaultClass;

  return (
    <>
      {/* Trigger Button */}
      {trigger ? (
        <div onClick={() => setIsOpen(true)} className={className}>
            {trigger}
        </div>
      ) : (
        <button
            onClick={() => setIsOpen(true)}
            className={`${buttonClass} bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white px-3 py-3 md:px-4 md:py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 dark:border-slate-700 backdrop-blur-md flex items-center gap-3 hover:scale-105 active:scale-95 group transition-all duration-300`}
        >
            <div className="bg-indigo-100/80 dark:bg-indigo-900/50 p-1.5 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:rotate-12 transition-transform duration-300 backdrop-blur-sm">
                <MessageSquarePlus size={20} />
            </div>
            <div className="text-left hidden sm:block">
                <div className="text-xs font-black tracking-wide">Feedback Hub</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Help us improve</div>
            </div>
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 w-[90%] md:w-full max-w-md max-h-[80vh] overflow-y-auto custom-scrollbar rounded-[2.5rem] p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out ring-1 ring-black/5 dark:ring-white/10">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors backdrop-blur-md z-10"
            >
              <X size={18} className="text-slate-500 dark:text-slate-400" />
            </button>

            <div className="mb-6 md:mb-8">
                <div className="w-12 h-12 bg-indigo-100/80 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 backdrop-blur-sm shadow-inner">
                    <MessageSquarePlus size={24} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Help Improve <br/>MedRussia</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">Spotted a bug? Have a cool feature idea? We'd love to hear from you!</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Feedback Type</label>
                    <div className="relative">
                        <select
                            className="w-full p-3.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none text-sm font-bold text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                            value={formData.feedbackType}
                            onChange={e => setFormData({...formData, feedbackType: e.target.value})}
                        >
                            <option>Feature suggestion</option>
                            <option>Missing information</option>
                            <option>UI / UX</option>
                            <option>Data accuracy</option>
                            <option>Other</option>
                        </select>
                        <div className="absolute right-4 top-4 pointer-events-none text-slate-400 text-xs opacity-70">▼</div>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Message</label>
                    <textarea 
                        required
                        className="w-full p-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px] text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 transition-all hover:bg-slate-100/50 dark:hover:bg-slate-800/50 resize-none"
                        placeholder="Tell us what's on your mind..."
                        value={formData.message}
                        onChange={e => setFormData({...formData, message: e.target.value})}
                    />
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Email (Optional)</label>
                    <input 
                        type="email"
                        className="w-full p-3.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                        placeholder="For follow-up questions"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                </div>

                <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-2xl hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                    {isSubmitting ? 'Sending...' : (
                        <>
                            <span>Submit Feedback</span>
                            <Send size={16} />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100/50 dark:border-slate-700/30 text-center">
                <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 font-medium opacity-70">
                    <AlertTriangle size={10} />
                    Please don’t share sensitive personal information.
                </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};