
import React, { useState, useEffect } from 'react';
import { registerUser, loginUser, getSecurityQuestion, resetPassword } from '../services/db';
import { User } from '../types';
import { LegalPageType } from './LegalPages';

interface LoginProps {
  onAuthSuccess: (user: User) => void;
  onCancel: () => void;
  onShowLegal?: (page: LegalPageType) => void;
}

type Mode = 'login' | 'register' | 'forgot';

export const Login: React.FC<LoginProps> = ({ onAuthSuccess, onCancel, onShowLegal }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [formData, setFormData] = useState({
    identifier: '', // email or username for login
    password: '',
    name: '',
    email: '',
    phone: ''
  });
  
  // Forgot Password State
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: Question, 3: New Pass
  const [resetEmail, setResetEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingScore, setPendingScore] = useState<string | null>(null);

  // Check for Hook (NEET Score)
  useEffect(() => {
    const score = localStorage.getItem('mr_neet_score');
    if (score) {
        setPendingScore(score);
        setMode('register'); 
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const user = await loginUser(formData.identifier, formData.password);
      if (user) {
        onAuthSuccess(user);
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        setIsSubmitting(false);
        return;
    }
    setError('');
    try {
      const user = await registerUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: 'student'
      });
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotStep1 = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError('');
      try {
          const question = await getSecurityQuestion(resetEmail);
          if (question) {
              setSecurityQuestion(question);
              setResetStep(2);
          } else {
              setError("Email not found or no security question set.");
          }
      } catch (e) { setError("Lookup failed"); }
      finally { setIsSubmitting(false); }
  };

  // Step 2 is just moving to step 3 in UI after validating answer logic is handled in step 3 submit
  // Wait, strict flow means checking answer locally? No, server side. 
  // We can't check answer here without exposing it.
  // We will collect answer in step 2 and submit in step 3 (conceptually merged or separated).
  // Let's refine: Step 2 shows question, user inputs answer -> User clicks Next -> We go to Step 3 (Password input).
  // Then Step 3 submits Email + Answer + NewPassword to resetPassword().
  const handleForgotStep2 = (e: React.FormEvent) => {
      e.preventDefault();
      if(!securityAnswer.trim()) { setError("Answer required"); return; }
      setError('');
      setResetStep(3);
  };

  const handleForgotStep3 = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError('');
      try {
          // STRICT CHECK: The backend function verifies email matches answer before updating password
          const success = await resetPassword(resetEmail, securityAnswer, newPassword);
          if (success) {
              setSuccessMsg("Password reset successfully! Please login.");
              setTimeout(() => {
                  setMode('login');
                  setResetStep(1);
                  setResetEmail('');
                  setSecurityAnswer('');
                  setNewPassword('');
                  setSuccessMsg('');
              }, 2000);
          } else {
              setError("Incorrect security answer.");
          }
      } catch (e) { setError("Reset failed"); }
      finally { setIsSubmitting(false); }
  };

  const inputClasses = "w-full px-4 py-2.5 md:px-4 md:py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm font-medium";
  const labelClasses = "block text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 md:mb-1.5 ml-1";

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12 p-5 md:p-8 bg-white dark:bg-slate-800 rounded-3xl md:rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
      
      {pendingScore && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-6 py-3 -mx-5 -mt-5 md:-mx-8 md:-mt-8 mb-6 md:mb-8 text-center border-b border-yellow-200 dark:border-yellow-900/50">
            <div className="text-lg md:text-xl mb-0.5">🎉</div>
            <p className="text-xs md:text-sm font-bold">Almost there!</p>
            <p className="text-[10px] md:text-xs">Create a free account to see the analysis for <span className="font-black">NEET Score: {pendingScore}</span></p>
        </div>
      )}

      <div className="text-center mb-6 md:mb-8">
        <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-white font-black text-xl md:text-2xl mx-auto mb-4 md:mb-6 shadow-[0_6px_0_rgb(49,46,129)] rotate-3 border-2 border-indigo-400">
          <span className="drop-shadow-md">MR</span>
        </div>
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-4">
          {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Create Account' : 'Recovery'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1">
          {mode === 'login' ? 'Access your medical dashboard' : mode === 'register' ? 'Join 600+ students in Russia' : 'Reset your password'}
        </p>
      </div>

      {mode !== 'forgot' && (
        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl md:rounded-2xl mb-6 md:mb-8">
            <button onClick={() => setMode('login')} className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg md:rounded-xl transition-all duration-300 ${mode === 'login' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-md ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>Login</button>
            <button onClick={() => setMode('register')} className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg md:rounded-xl transition-all duration-300 ${mode === 'register' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-md ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>Register</button>
        </div>
      )}

      {error && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs font-bold rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-2 animate-in slide-in-from-top-2">
          <span>⚠️</span> {error}
        </div>
      )}
      
      {successMsg && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 text-xs font-bold rounded-xl border border-green-100 dark:border-green-900/30 flex items-center gap-2 animate-in slide-in-from-top-2">
          <span>✓</span> {successMsg}
        </div>
      )}

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-4 md:space-y-5">
          <div>
            <label className={labelClasses}>Email or Username</label>
            <input type="text" required className={inputClasses} placeholder="e.g. email@example.com" value={formData.identifier} onChange={(e) => setFormData({...formData, identifier: e.target.value})} />
          </div>
          <div>
            <label className={labelClasses}>Password</label>
            <input type="password" required className={inputClasses} placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            <div className="text-right mt-1"><button type="button" onClick={() => { setMode('forgot'); setError(''); }} className="text-[10px] text-indigo-500 hover:text-indigo-600 font-bold">Forgot Password?</button></div>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-3 md:py-4 rounded-xl hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 mt-4 text-sm">{isSubmitting ? <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Sign In'}</button>
        </form>
      ) : mode === 'register' ? (
        <form onSubmit={handleRegister} className="space-y-3 md:space-y-4">
          <div><label className={labelClasses}>Full Name</label><input type="text" required className={inputClasses} placeholder="e.g. Aditi Rao" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
          <div><label className={labelClasses}>Email Address</label><input type="email" required className={inputClasses} placeholder="name@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
          <div><label className={labelClasses}>WhatsApp Number</label><input type="tel" required className={inputClasses} placeholder="+91..." value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
          <div>
            <label className={labelClasses}>Create Password</label>
            <input type="password" required className={inputClasses} placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            <p className="text-[9px] md:text-[10px] text-slate-400 mt-1 ml-1 font-medium flex items-center gap-1"><span className={formData.password.length >= 6 ? "text-green-500" : "text-slate-300"}>●</span> Must be at least 6 characters</p>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-bold py-3 md:py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 mt-4 text-sm">{isSubmitting ? <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Register Account'}</button>
        </form>
      ) : (
          <form onSubmit={resetStep === 1 ? handleForgotStep1 : resetStep === 2 ? handleForgotStep2 : handleForgotStep3} className="space-y-4">
              {resetStep === 1 && (
                  <div className="animate-in fade-in slide-in-from-right-4">
                      <label className={labelClasses}>Enter Email Address</label>
                      <input type="email" required className={inputClasses} value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="email@example.com" />
                  </div>
              )}
              {resetStep === 2 && (
                  <div className="animate-in fade-in slide-in-from-right-4">
                      <label className={labelClasses}>Security Question</label>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 mb-4">{securityQuestion}</div>
                      <label className={labelClasses}>Your Answer</label>
                      <input type="text" required className={inputClasses} value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} placeholder="Answer..." />
                  </div>
              )}
              {resetStep === 3 && (
                  <div className="animate-in fade-in slide-in-from-right-4">
                      <label className={labelClasses}>New Password</label>
                      <input type="password" required className={inputClasses} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" />
                  </div>
              )}
              <div className="flex gap-2 mt-4">
                  <button type="button" onClick={() => { setMode('login'); setResetStep(1); }} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-sm">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm">{isSubmitting ? '...' : (resetStep === 3 ? 'Reset Password' : 'Next')}</button>
              </div>
          </form>
      )}

      <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-slate-100 dark:border-slate-700 text-center">
        <div className="flex justify-center gap-3 text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <button onClick={() => onShowLegal && onShowLegal('privacy')} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy</button>
          <span>•</span>
          <button onClick={() => onShowLegal && onShowLegal('terms')} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms</button>
        </div>
      </div>

      <button onClick={onCancel} className="w-full mt-4 text-slate-400 dark:text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-widest hover:text-indigo-600 dark:hover:text-indigo-400 py-2 md:py-4 transition-colors flex items-center justify-center gap-2"><span>←</span> Back to Home</button>
    </div>
  );
};
