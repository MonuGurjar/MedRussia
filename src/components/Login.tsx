import React, { useState, useEffect, useMemo } from 'react';
import { registerUser, loginUser } from '../services/db';
import { platformAuthService } from '../services/platform/authService';
import { PlatformApiError } from '../lib/platformErrors';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { LegalPageType } from './LegalPages';
import campusImg from '../assets/med_university_campus.png';

interface LoginProps {
  onAuthSuccess: (user: User) => void;
  onCancel: () => void;
  onShowLegal?: (page: LegalPageType) => void;
}

type Mode = 'login' | 'register' | 'forgot';

export const Login: React.FC<LoginProps> = ({ onAuthSuccess, onCancel, onShowLegal }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    name: '',
    username: '',
    email: '',
    phone: ''
  });
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [errorBanner, setErrorBanner] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingScore, setPendingScore] = useState<string | null>(null);
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);

  useEffect(() => { 
    const score = localStorage.getItem('mr_neet_score'); 
    const category = localStorage.getItem('mr_category');
    if (score) { 
      setPendingScore(score); 
      if (category) setPendingCategory(category);
      setMode('register'); 
    } 
  }, []);

  // Live Password Validation Checklist (matching backend validate_password_strength)
  const passwordChecks = useMemo(() => {
    const pwd = formData.password;
    return {
      minLength: pwd.length >= 8,
      maxLength: pwd.length <= 128,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
    };
  }, [formData.password]);

  const isPasswordValid = 
    passwordChecks.minLength && 
    passwordChecks.maxLength && 
    passwordChecks.hasUpper && 
    passwordChecks.hasLower && 
    passwordChecks.hasNumber;

  // Live Username Validation Checklist (matching backend sanitize_username: ^[a-z0-9_]{3,32}$)
  const isUsernameValid = useMemo(() => {
    return /^[a-z0-9_]{3,32}$/.test(formData.username.trim());
  }, [formData.username]);

  // Live Email Validation
  const isEmailValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
  }, [formData.email]);

  const clearErrors = () => {
    setErrorBanner('');
    setFieldErrors({});
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    clearErrors();
    setSuccessMsg('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    clearErrors();
    const identifier = formData.identifier.trim();
    if (!identifier) {
      setFieldErrors({ identifier: 'Please enter your email or username.' });
      return;
    }
    if (!formData.password) {
      setFieldErrors({ password: 'Password is required.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await loginUser(identifier, formData.password);
      if (user) {
        onAuthSuccess(user);
      } else {
        setErrorBanner('Invalid email/username or password.');
      }
    } catch (err: any) {
      if (err instanceof PlatformApiError) {
        if (err.statusCode === 401) {
          setErrorBanner('Incorrect email/username or password.');
        } else if (err.statusCode === 429) {
          setErrorBanner('Too many login attempts. Please wait a moment and try again.');
        } else {
          setErrorBanner(err.message || 'Unable to sign in. Please try again.');
        }
      } else {
        setErrorBanner(err.message || 'Unable to connect to MedRussia. Please verify your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    clearErrors();
    const errors: Record<string, string> = {};

    // 1. Full Name Validation
    if (formData.name.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters.';
    }

    // 2. Username Validation
    const cleanUsername = formData.username.trim().toLowerCase();
    if (!cleanUsername) {
      errors.username = 'Username is required.';
    } else if (cleanUsername.length < 3) {
      errors.username = 'Username must be at least 3 characters.';
    } else if (cleanUsername.length > 32) {
      errors.username = 'Username cannot exceed 32 characters.';
    } else if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      errors.username = 'Only lowercase letters, numbers, and underscores are allowed.';
    }

    // 3. Email Validation
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!isEmailValid) {
      errors.email = 'Please enter a valid email address.';
    }

    // 4. Password Validation (Enforcing exact backend constraints)
    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (!passwordChecks.minLength) {
      errors.password = 'Password must be at least 8 characters long.';
    } else if (!passwordChecks.hasUpper) {
      errors.password = 'Password must contain at least one uppercase letter (A-Z).';
    } else if (!passwordChecks.hasLower) {
      errors.password = 'Password must contain at least one lowercase letter (a-z).';
    } else if (!passwordChecks.hasNumber) {
      errors.password = 'Password must contain at least one number (0-9).';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await registerUser({
        name: formData.name.trim(),
        username: cleanUsername,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim() || undefined,
        role: 'student'
      });
      if (user) {
        onAuthSuccess(user);
      }
    } catch (err: any) {
      if (err instanceof PlatformApiError) {
        const serverFieldErrors = err.getFieldErrors();
        if (Object.keys(serverFieldErrors).length > 0) {
          setFieldErrors(serverFieldErrors);
        }
        
        if (err.statusCode === 409) {
          setErrorBanner(err.problem?.detail || 'An account with this email or username already exists.');
        } else if (err.statusCode === 422) {
          setErrorBanner(err.message || 'Please correct the highlighted fields and try again.');
        } else {
          setErrorBanner(err.message || 'Registration failed. Please try again.');
        }
      } else {
        setErrorBanner(err.message || 'Unable to connect to MedRussia. Please verify your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    clearErrors();
    if (!resetEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
      setErrorBanner('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try { 
      await platformAuthService.requestPasswordReset(resetEmail.trim());
      setSuccessMsg("If an account exists with this email, password reset instructions have been sent."); 
      setTimeout(() => { 
        setMode('login'); 
        setResetStep(1); 
        setResetEmail(''); 
        setSuccessMsg(''); 
      }, 4000); 
    } catch (err: any) { 
      setErrorBanner(err.message || "Failed to send reset email. Please try again."); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth`
        }
      });
      if (error) setErrorBanner(error.message);
    } catch (e) {
      setErrorBanner("OAuth login failed. Please try password login.");
    }
  };

  const inputCls = (hasError: boolean) => 
    `w-full px-4 py-3 rounded-xl border bg-white text-slate-900 outline-none transition-all placeholder:text-slate-400 text-[15px] ${
      hasError 
        ? 'border-red-400 focus:ring-2 focus:ring-red-400 focus:border-red-400' 
        : 'border-slate-200 focus:ring-1 focus:ring-slate-900 focus:border-slate-900'
    }`;
  
  const labelCls = "block text-[13px] text-slate-700 font-semibold mb-1.5";

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#f8fafc] font-sans">
      {/* Left side: Hero image and message */}
      <div className="w-full md:w-5/12 lg:w-1/2 flex flex-col justify-between relative overflow-hidden bg-slate-900 min-h-[280px] md:min-h-[550px]">
        <img 
          src={campusImg} 
          alt="Russian Medical University Campus" 
          className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-700 hover:scale-105" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#031835] via-[#031835]/60 to-[#031835]/10 z-10"></div>

        {/* Floating Back to Home Button */}
        <div className="relative z-30 p-4 sm:p-6 md:p-8">
          <button 
            onClick={onCancel} 
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/70 hover:bg-slate-900/90 text-white font-bold text-xs sm:text-sm rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-105 shadow-md cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">arrow_back</span> Back to home
          </button>
        </div>

        <div className="relative z-20 p-6 sm:p-10 md:p-14 lg:p-20 mt-auto">
           <div className="inline-block bg-[#f59e0b] text-amber-950 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full mb-2 sm:mb-4 tracking-wide uppercase shadow-md">
             Academic Excellence
           </div>
           <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-2 sm:mb-6 drop-shadow-sm">
             Start Your Global Medical Career Here.
           </h1>
           <p className="text-slate-200 leading-relaxed max-w-md font-medium text-xs sm:text-base drop-shadow-sm hidden sm:block">
             Join thousands of students who have trusted us to guide their journey to top medical universities in Russia. Your future in medicine begins with a single step.
           </p>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full md:w-7/12 lg:w-1/2 flex items-center justify-center p-4 sm:p-6 md:p-12 lg:p-20 relative overflow-y-auto">
        <div className="w-full max-w-[440px] mx-auto fade-in-up pt-4 md:pt-0">

          {pendingScore && (
            <div className="bg-[#1a365d]/5 text-[#1a365d] px-5 py-4 rounded-xl mb-8 border border-slate-200 flex items-start gap-3 shadow-xs">
              <span className="material-symbols-outlined text-amber-500 text-[22px] shrink-0">verified</span>
              <div>
                <p className="font-bold text-sm text-slate-900">NEET Eligibility Details Recorded!</p>
                <p className="text-xs mt-0.5 text-slate-600 leading-relaxed">
                  Sign in or create a free account to unlock full analysis for <span className="font-extrabold text-slate-900">NEET: {pendingScore}</span> {pendingCategory && <span>| Category: <span className="font-extrabold text-slate-900">{pendingCategory}</span></span>}.
                </p>
              </div>
            </div>
          )}

          {errorBanner && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs sm:text-sm font-semibold rounded-xl border border-red-200 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5 text-red-600">warning</span>
              <span className="leading-relaxed">{errorBanner}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 text-xs sm:text-sm font-semibold rounded-xl border border-emerald-200 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5 text-emerald-600">check_circle</span>
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create an account' : 'Reset password'}
            </h2>
            <p className="text-slate-500 mt-2 text-[15px]">
              {mode === 'login' ? 'Please enter your details to sign in.' : mode === 'register' ? 'Enter your details to get started.' : 'Follow the steps to recover your account.'}
            </p>
          </div>

          {/* LOGIN VIEW */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div>
                <label className={labelCls}>Email address or Username</label>
                <input 
                  type="text" 
                  required 
                  className={inputCls(!!fieldErrors.identifier)} 
                  placeholder="Enter your email or username" 
                  value={formData.identifier} 
                  onChange={(e) => {
                    setFormData({...formData, identifier: e.target.value});
                    if (fieldErrors.identifier) setFieldErrors({...fieldErrors, identifier: ''});
                  }} 
                />
                {fieldErrors.identifier && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {fieldErrors.identifier}
                  </p>
                )}
              </div>

              <div>
                <label className={labelCls}>Password</label>
                <input 
                  type="password" 
                  required 
                  className={inputCls(!!fieldErrors.password)} 
                  placeholder="Enter your password" 
                  value={formData.password} 
                  onChange={(e) => {
                    setFormData({...formData, password: e.target.value});
                    if (fieldErrors.password) setFieldErrors({...fieldErrors, password: ''});
                  }} 
                />
                {fieldErrors.password && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
                  <span className="text-[13px] font-semibold text-slate-500 select-none">Remember me</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => handleModeChange('forgot')} 
                  className="text-[13px] font-bold text-slate-900 hover:text-slate-700 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-amber-950 font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 mt-6 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-amber-950 border-t-transparent rounded-full animate-spin"></span>
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>
          ) : mode === 'register' ? (
            /* REGISTRATION VIEW */
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <div>
                <label className={labelCls}>Full Name</label>
                <input 
                  type="text" 
                  required 
                  className={inputCls(!!fieldErrors.name)} 
                  placeholder="Enter your full name" 
                  value={formData.name} 
                  onChange={(e) => {
                    setFormData({...formData, name: e.target.value});
                    if (fieldErrors.name) setFieldErrors({...fieldErrors, name: ''});
                  }} 
                />
                {fieldErrors.name && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className={labelCls}>Username</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold text-[14px]">@</span>
                  <input 
                    type="text" 
                    required 
                    className={`${inputCls(!!fieldErrors.username)} pl-8`} 
                    placeholder="e.g. rahul_sharma" 
                    value={formData.username} 
                    onChange={(e) => {
                      setFormData({...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')});
                      if (fieldErrors.username) setFieldErrors({...fieldErrors, username: ''});
                    }} 
                  />
                </div>
                {fieldErrors.username ? (
                  <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {fieldErrors.username}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">3-32 characters, lowercase letters, numbers, underscores only</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Email address</label>
                <input 
                  type="email" 
                  required 
                  className={inputCls(!!fieldErrors.email)} 
                  placeholder="name@example.com" 
                  value={formData.email} 
                  onChange={(e) => {
                    setFormData({...formData, email: e.target.value});
                    if (fieldErrors.email) setFieldErrors({...fieldErrors, email: ''});
                  }} 
                />
                {fieldErrors.email && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className={labelCls}>WhatsApp Mobile Number (Optional)</label>
                <input 
                  type="tel" 
                  className={inputCls(!!fieldErrors.phone)} 
                  placeholder="+91 9876543210" 
                  value={formData.phone} 
                  onChange={(e) => {
                    setFormData({...formData, phone: e.target.value});
                    if (fieldErrors.phone) setFieldErrors({...fieldErrors, phone: ''});
                  }} 
                />
                {fieldErrors.phone && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className={labelCls}>Create Password</label>
                <input 
                  type="password" 
                  required 
                  className={inputCls(!!fieldErrors.password)} 
                  placeholder="Create secure password" 
                  value={formData.password} 
                  onChange={(e) => {
                    setFormData({...formData, password: e.target.value});
                    if (fieldErrors.password) setFieldErrors({...fieldErrors, password: ''});
                  }} 
                />
                {fieldErrors.password && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1 mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {fieldErrors.password}
                  </p>
                )}

                {/* Live Password Strength Checklist */}
                <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Password Requirements</p>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${passwordChecks.minLength ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      <span className="material-symbols-outlined text-[15px]">
                        {passwordChecks.minLength ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      At least 8 characters
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordChecks.hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      <span className="material-symbols-outlined text-[15px]">
                        {passwordChecks.hasNumber ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      At least one number (0-9)
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordChecks.hasUpper ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      <span className="material-symbols-outlined text-[15px]">
                        {passwordChecks.hasUpper ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      One uppercase (A-Z)
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordChecks.hasLower ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      <span className="material-symbols-outlined text-[15px]">
                        {passwordChecks.hasLower ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      One lowercase (a-z)
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !isPasswordValid || !isUsernameValid || !isEmailValid || formData.name.trim().length < 2} 
                className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-amber-950 font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 mt-6 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-amber-950 border-t-transparent rounded-full animate-spin"></span>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Sign Up</span>
                )}
              </button>
            </form>
          ) : (
            /* FORGOT PASSWORD VIEW */
            <form onSubmit={handleForgotStep1} className="space-y-5" noValidate>
              <div>
                <label className={labelCls}>Enter Registered Email Address</label>
                <input 
                  type="email" 
                  required 
                  className={inputCls(false)} 
                  value={resetEmail} 
                  onChange={e => setResetEmail(e.target.value)} 
                  placeholder="name@example.com" 
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => handleModeChange('login')} 
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-[14px] cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-[14px] cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </button>
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
                <button 
                  type="button" 
                  onClick={() => handleOAuthLogin('google')} 
                  className="flex justify-center items-center py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                </button>
                <button 
                  type="button" 
                  onClick={() => handleOAuthLogin('facebook')} 
                  className="flex justify-center items-center py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                   <svg className="w-5 h-5 text-slate-900" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.78.78-.04 1.84-.71 3.24-.65 1.16.06 2.07.41 2.86 1.03-1.8 1.17-1.52 3.63.35 4.54-.53 1.48-1.12 2.84-2.18 3.97-1.07 1.13-1.63 1.13-2.31 1.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.02 4.41-3.74 4.25z"/></svg>
                </button>
              </div>

              <div className="mt-8 text-center text-[14px]">
                <span className="text-slate-500 font-semibold">
                  {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                </span>
                <button 
                  onClick={() => handleModeChange(mode === 'login' ? 'register' : 'login')} 
                  className="text-slate-900 font-bold hover:underline cursor-pointer"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </div>
            </>
          )}

          <div className="mt-12 text-center text-xs text-slate-400 font-semibold flex justify-center gap-4">
             <button onClick={() => onShowLegal && onShowLegal('privacy')} className="hover:text-slate-600 cursor-pointer">Privacy Policy</button>
             <button onClick={() => onShowLegal && onShowLegal('terms')} className="hover:text-slate-600 cursor-pointer">Terms of Service</button>
          </div>
        </div>
      </div>
    </div>
  );
};
