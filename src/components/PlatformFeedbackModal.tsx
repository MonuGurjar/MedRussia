import React, { useState } from 'react';
import { savePlatformFeedback } from '../services/db';

interface PlatformFeedbackModalProps { className?: string; trigger?: React.ReactNode; }

export const PlatformFeedbackModal: React.FC<PlatformFeedbackModalProps> = ({ className, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ feedbackType: 'Feature suggestion', message: '', email: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim()) return;
    setIsSubmitting(true);
    try {
      const activeUser = localStorage.getItem('mr_active_user');
      await savePlatformFeedback({ feedbackType: formData.feedbackType as any, message: formData.message, email: formData.email, userRole: activeUser ? 'user' : 'guest' });
      setFormData({ feedbackType: 'Feature suggestion', message: '', email: '' });
      setIsOpen(false);
      alert("Thank you! Your feedback helps us improve MedGuide Russia.");
    } catch (error) { alert("Failed to submit feedback."); } finally { setIsSubmitting(false); }
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)} className={className}>{trigger}</div>
      ) : (
        <button onClick={() => setIsOpen(true)} className={`${className || 'fixed bottom-20 left-4 z-[60] md:bottom-8 md:left-8'} bg-surface-container-lowest text-on-surface px-4 py-3 rounded-xl shadow-lg border border-outline-variant flex items-center gap-3 hover:scale-105 active:scale-95 group transition-all duration-300`}>
          <div className="bg-primary/10 p-1.5 rounded-lg text-primary group-hover:rotate-12 transition-transform duration-300"><span className="material-symbols-outlined">rate_review</span></div>
          <div className="text-left hidden sm:block"><div className="text-label-md font-semibold">Feedback Hub</div><div className="text-label-sm text-on-surface-variant">Help us improve</div></div>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 fade-in-up">
          <div className="bg-surface-container-lowest border border-outline-variant w-[90%] md:w-full max-w-md max-h-[80vh] overflow-y-auto custom-scrollbar rounded-xl p-6 md:p-8 shadow-xl relative">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 p-2 bg-surface-container-low rounded-full hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant" style={{fontSize:'18px'}}>close</span>
            </button>
            <div className="mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4"><span className="material-symbols-outlined" style={{fontSize:'24px'}}>rate_review</span></div>
              <h3 className="text-headline-md text-on-surface">Help Improve MedGuide Russia</h3>
              <p className="text-body-md text-on-surface-variant mt-2">Spotted a bug? Have a cool feature idea? We'd love to hear from you!</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-2 block">Feedback Type</label>
                <select className="w-full p-3 bg-surface border border-outline-variant rounded-lg outline-none focus:ring-1 focus:ring-primary text-body-md text-on-surface" value={formData.feedbackType} onChange={e => setFormData({...formData, feedbackType: e.target.value})}>
                  <option>Feature suggestion</option><option>Missing information</option><option>UI / UX</option><option>Data accuracy</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-2 block">Message</label>
                <textarea required className="w-full p-4 bg-surface border border-outline-variant rounded-lg outline-none focus:ring-1 focus:ring-primary min-h-[100px] text-body-md text-on-surface resize-none" placeholder="Tell us what's on your mind..." value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
              </div>
              <div>
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-2 block">Email (Optional)</label>
                <input type="email" className="w-full p-3 bg-surface border border-outline-variant rounded-lg outline-none focus:ring-1 focus:ring-primary text-body-md text-on-surface" placeholder="For follow-up questions" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-container transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? 'Sending...' : <><span>Submit Feedback</span><span className="material-symbols-outlined" style={{fontSize:'18px'}}>send</span></>}
              </button>
            </form>
            <div className="mt-6 pt-4 border-t border-outline-variant text-center">
              <p className="text-label-sm text-on-surface-variant flex items-center justify-center gap-1.5"><span className="material-symbols-outlined" style={{fontSize:'14px'}}>warning</span>Please don't share sensitive personal information.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
