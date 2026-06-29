import React, { useState, useEffect } from 'react';
import { registerUser, loginUser } from '../services/db';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { LegalPageType } from './LegalPages';

interface LoginProps { onAuthSuccess: (user: User) => void; onCancel: () => void; onShowLegal?: (page: LegalPageType) => void; }
type Mode = 'login' | 'register' | 'forgot';

export const Login: React.FC<LoginProps> = ({ onAuthSuccess, onCancel, onShowLegal }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [formData, setFormData] = useState({ identifier: '', password: '', name: '', email: '', phone: '' });
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingScore, setPendingScore] = useState<string | null>(null);

  useEffect(() => { const score = localStorage.getItem('mr_neet_score'); if (score) { setPendingScore(score); setMode('register'); } }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true); setError('');
    try { const user = await loginUser(formData.identifier, formData.password); if (user) onAuthSuccess(user); else setError('Invalid credentials'); } catch (err: any) { setError(err.message || 'Login failed'); } finally { setIsSubmitting(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    if (formData.password.length < 6) { setError('Password must be at least 6 characters long'); setIsSubmitting(false); return; }
    setError('');
    try { const user = await registerUser({ name: formData.name, email: formData.email, password: formData.password, phone: formData.phone, role: 'student' }); onAuthSuccess(user); } catch (err: any) { setError(err.message || 'Registration failed'); } finally { setIsSubmitting(false); }
  };

  const handleForgotStep1 = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true); setError('');
    try { 
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
      if (error) {
        setError(error.message);
      } else {
        setSuccessMsg("Password reset email sent! Please check your inbox."); 
        setTimeout(() => { setMode('login'); setResetStep(1); setResetEmail(''); setSuccessMsg(''); }, 3000); 
      }
    } catch (e) { setError("Failed to send reset email"); } finally { setIsSubmitting(false); }
  };

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth`
        }
      });
      if (error) setError(error.message);
    } catch (e) {
      setError("OAuth login failed");
    }
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all placeholder:text-slate-400 text-[15px]";
  const labelCls = "block text-[13px] text-slate-700 font-semibold mb-2";

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#f8fafc] font-sans">
      {/* Left side: Hero image and message */}
      <div className="w-full md:w-5/12 lg:w-1/2 flex flex-col relative overflow-hidden bg-slate-900">
        <div className="flex-1 relative">
           {/* Placeholder for the top gradient / image */}
           <div className="absolute inset-0 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-900/0"></div>
        </div>
        <div className="bg-[#031835] p-10 md:p-14 lg:p-20 relative z-10 shrink-0">
           <h3 className="text-white/90 font-bold mb-6">Academic Excellence</h3>
           <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-8">
             Start Your Global Medical Career Here.
           </h1>
           <p className="text-slate-300 leading-relaxed max-w-md">
             Join thousands of students who have trusted us to guide their journey to top medical universities in Russia. Your future in medicine begins with a single step.
           </p>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full md:w-7/12 lg:w-1/2 flex items-center justify-center p-6 md:p-12 lg:p-20 relative overflow-y-auto">
        <div className="w-full max-w-[440px] mx-auto fade-in-up">
          <button onClick={onCancel} className="flex items-center gap-2 text-slate-500 font-semibold text-[13px] hover:text-slate-800 transition-colors mb-10">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to home
          </button>

          {pendingScore && mode === 'register' && (
            <div className="bg-blue-50 text-blue-800 px-5 py-4 rounded-xl mb-8 border border-blue-100 flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-500">celebration</span>
              <div>
                <p className="font-bold text-sm">Almost there!</p>
                <p className="text-[13px] mt-0.5 opacity-90">Create a free account to see the analysis for <span className="font-bold">NEET Score: {pendingScore}</span></p>
              </div>
            </div>
          )}

          {error && <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm font-semibold rounded-xl border border-red-100 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">warning</span>{error}</div>}
          {successMsg && <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-xl border border-emerald-100 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">check_circle</span>{successMsg}</div>}

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create an account' : 'Reset password'}
            </h2>
            <p className="text-slate-500 mt-2 text-[15px]">
              {mode === 'login' ? 'Please enter your details to sign in.' : mode === 'register' ? 'Enter your details to get started.' : 'Follow the steps to recover your account.'}
            </p>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className={labelCls}>Email address</label>
                <input type="text" required className={inputCls} placeholder="Enter your email" value={formData.identifier} onChange={(e) => setFormData({...formData, identifier: e.target.value})} />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input type="password" required className={inputCls} placeholder="Enter your password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-[#fca5a5] focus:ring-[#f59e0b]" />
                  <span className="text-[13px] font-semibold text-slate-500 select-none">Remember me</span>
                </label>
                <button type="button" onClick={() => { setMode('forgot'); setError(''); }} className="text-[13px] font-bold text-slate-900 hover:text-slate-700">Forgot password?</button>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-[#fbbf24] text-amber-950 font-bold py-3.5 rounded-xl hover:bg-[#f59e0b] transition-colors flex items-center justify-center mt-6 shadow-sm">
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          ) : mode === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div><label className={labelCls}>Full Name</label><input type="text" required className={inputCls} placeholder="Enter your full name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
              <div><label className={labelCls}>Email address</label><input type="email" required className={inputCls} placeholder="Enter your email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
              <div><label className={labelCls}>WhatsApp Number</label><input type="tel" required className={inputCls} placeholder="+91..." value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
              <div><label className={labelCls}>Create Password</label><input type="password" required className={inputCls} placeholder="Create a password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} /><p className="text-[11px] text-slate-400 mt-1 font-semibold">Must be at least 6 characters</p></div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-[#fbbf24] text-amber-950 font-bold py-3.5 rounded-xl hover:bg-[#f59e0b] transition-colors flex items-center justify-center mt-6 shadow-sm">
                {isSubmitting ? 'Registering...' : 'Sign Up'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotStep1} className="space-y-5">
              <div><label className={labelCls}>Enter Email Address</label><input type="email" required className={inputCls} value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="email@example.com" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setMode('login'); setResetStep(1); }} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-[14px]">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-[14px]">{isSubmitting ? 'Sending...' : 'Send Reset Link'}</button>
              </div>
            </form>
          )}

          {(mode === 'login' || mode === 'register') && (
            <>
              <div className="flex items-center my-8">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="px-4 text-[13px] font-semibold text-slate-400">Or continue with</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => handleOAuthLogin('google')} className="flex justify-center items-center py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                </button>
                <button type="button" onClick={() => handleOAuthLogin('facebook')} className="flex justify-center items-center py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                   <svg className="w-5 h-5 text-slate-900" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.78.78-.04 1.84-.71 3.24-.65 1.16.06 2.07.41 2.86 1.03-1.8 1.17-1.52 3.63.35 4.54-.53 1.48-1.12 2.84-2.18 3.97-1.07 1.13-1.63 1.13-2.31 1.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.02 4.41-3.74 4.25z"/></svg>
                </button>
              </div>

              <div className="mt-8 text-center text-[14px]">
                <span className="text-slate-500 font-semibold">
                  {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                </span>
                <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-slate-900 font-bold hover:underline">
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </div>
            </>
          )}

          <div className="mt-12 text-center text-xs text-slate-400 font-semibold flex justify-center gap-4">
             <button onClick={() => onShowLegal && onShowLegal('privacy')} className="hover:text-slate-600">Privacy Policy</button>
             <button onClick={() => onShowLegal && onShowLegal('terms')} className="hover:text-slate-600">Terms of Service</button>
          </div>
        </div>
      </div>
    </div>
  );
};
