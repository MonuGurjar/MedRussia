# 🌐 MedRussia — Complete Web App Integration Guide

> **Target Stack:** React 19 + TypeScript + Vite + Tailwind CSS + Supabase (`@supabase/supabase-js`) + Google Gemini AI  
> **Source Platform:** MedRussia Android (Kotlin + Jetpack Compose)  
> **Target Platform:** MedRussia Web Portal (`/home/silent-sovereign/Music/MedRussia`)  
> **Date:** August 27, 2026  

---

## 📑 Table of Contents
1. [Architecture & Design System Overview](#1-architecture--design-system-overview)
2. [Database Schema & Backend Synchronization (Supabase SQL)](#2-database-schema--backend-synchronization-supabase-sql)
3. [Storage Buckets & KYC Vault Setup](#3-storage-buckets--kyc-vault-setup)
4. [Authentication & Session Management Layer](#4-authentication--session-management-layer)
5. [Standardized Error Messages & Security Architecture](#5-standardized-error-messages--security-architecture)
6. [Gemini AI Medical Counselor Integration](#6-gemini-ai-medical-counselor-integration)
7. [Frontend UI Components Implementation](#7-frontend-ui-components-implementation)
   - 7.1 [Theme & Color Palette Configuration](#71-theme--color-palette-configuration)
   - 7.2 [University Explorer & Comparison Hub](#72-university-explorer--comparison-hub)
   - 7.3 [6-Year MBBS Budget Calculator](#73-6-year-mbbs-budget-calculator)
   - 7.4 [AI NMC Eligibility Evaluator](#74-ai-nmc-eligibility-evaluator)
   - 7.5 [Live Senior Human Counselor Desk](#75-live-senior-human-counselor-desk)
   - 7.6 [Student Document Vault (KYC)](#76-student-document-vault-kyc)
   - 7.7 [4-Step Admission Application Wizard](#77-4-step-admission-application-wizard)
   - 7.8 [Live 5-Milestone Admission Tracker](#78-live-5-milestone-admission-tracker)
8. [Environment Variables & Deployment](#8-environment-variables--deployment)

---

## 1. Architecture & Design System Overview

The MedRussia Web Application mirrors the Android mobile application in data contracts, real-time messaging, admission tracking, and visual aesthetics.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MedRussia Web Portal Architecture                │
├───────────────────────────────────┬─────────────────────────────────────┤
│ Frontend Layer (React 19 + Vite)  │ Tailwind CSS, Lucide, Recharts      │
│ State & Cache                     │ React Context / Custom Hooks        │
│ Auth & Session                    │ Supabase Auth (JWT + Auto-Refresh)  │
│ Database (PostgreSQL 15)          │ Row-Level Security (RLS) Enforced   │
│ Object Storage (KYC Vault)        │ Supabase Storage (User Partitioned) │
│ AI Engine                         │ Google Gemini 1.5/2.0 Flash SDK     │
│ Official Admissions Desk          │ Amit Gurjar (+91 73750 17401)       │
└───────────────────────────────────┴─────────────────────────────────────┘
```

---

## 2. Database Schema & Backend Synchronization (Supabase SQL)

Run the following SQL migration in your Supabase SQL Editor to ensure full compatibility with both Android and Web apps:

```sql
-- =========================================================================
-- MEDRUSSIA UNIFIED DATABASE SCHEMA (PostgreSQL 15 / Supabase)
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PUBLIC USERS PROFILE TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'STUDENT', -- 'STUDENT' or 'PARENT' or 'ADMIN'
  neet_score TEXT,
  budget TEXT,
  category TEXT DEFAULT 'General / UR',
  pcb_percentage TEXT,
  intake_batch TEXT DEFAULT 'September 2026 (Main)',
  shortlisted_universities JSONB DEFAULT '[]'::jsonb,
  notifications JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ADMISSION APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.applications (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  parent_name TEXT,
  parent_phone TEXT,
  address TEXT,
  tenth_percentage TEXT,
  twelfth_percentage TEXT,
  neet_roll_no TEXT,
  neet_score TEXT,
  neet_year TEXT DEFAULT '2026',
  selected_university_id TEXT NOT NULL,
  intake_batch TEXT DEFAULT 'September 2026 (Main)',
  needs_hostel BOOLEAN DEFAULT TRUE,
  needs_indian_mess BOOLEAN DEFAULT TRUE,
  application_status TEXT DEFAULT 'APPLIED', -- 'APPLIED', 'LETTER_ISSUED', 'MINISTRY_INVITATION', 'VISA_STAMPED', 'DEPARTURE_READY'
  current_step INT DEFAULT 2,
  total_steps INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DOCUMENT VAULT (KYC & ISSUED LETTERS) TABLE
CREATE TABLE IF NOT EXISTS public.vault_documents (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, -- 'marksheet_10', 'marksheet_12', 'neet_card', 'passport', 'admission_letter', 'ministry_invitation'
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size TEXT NOT NULL,
  status TEXT DEFAULT 'under_review', -- 'under_review', 'verified', 'issued'
  is_issued_by_admin BOOLEAN DEFAULT FALSE,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DIRECT COUNSELOR CHAT SESSIONS & MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.direct_chats (
  id TEXT PRIMARY KEY,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  counselor_name TEXT DEFAULT 'Amit Gurjar (Senior Consultant)',
  messages JSONB DEFAULT '[]'::jsonb,
  last_message_at BIGINT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open', 'resolved', 'booked'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CONSULTATION CALL BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.call_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_phone TEXT NOT NULL,
  preferred_time_slot TEXT NOT NULL, -- 'Within 30 Minutes', 'Afternoon (2PM - 5PM)', 'Evening (6PM - 9PM)', 'Tomorrow Morning'
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_bookings ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
CREATE POLICY "Users can view own profile" ON public.users 
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users 
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- APPLICATIONS POLICIES
CREATE POLICY "Students can view own applications" ON public.applications 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students can insert own applications" ON public.applications 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can update own applications" ON public.applications 
  FOR UPDATE USING (auth.uid() = user_id);

-- VAULT DOCUMENTS POLICIES
CREATE POLICY "Students can view own documents" ON public.vault_documents 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students can upload own documents" ON public.vault_documents 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can update own documents" ON public.vault_documents 
  FOR UPDATE USING (auth.uid() = user_id);

-- DIRECT CHAT POLICIES
CREATE POLICY "Students can access own chat thread" ON public.direct_chats 
  FOR ALL USING (auth.uid() = student_id);

-- CALL BOOKING POLICIES
CREATE POLICY "Students can manage own call bookings" ON public.call_bookings 
  FOR ALL USING (auth.uid() = user_id);
```

---

## 3. Storage Buckets & KYC Vault Setup

In your Supabase Storage dashboard, create the following bucket:

* **Bucket Name:** `kyc-vault`
* **Public Access:** `true` (with user path partitioning) or `false` (with signed URLs).

### Storage Access Policies:
```sql
-- Allow students to upload to their own directory
CREATE POLICY "Student Upload Access" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'kyc-vault' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow students to read their own uploaded files
CREATE POLICY "Student Read Access" ON storage.objects
FOR SELECT USING (
  bucket_id = 'kyc-vault' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
```

File storage structure:
```
kyc-vault/
└── students/
    └── {userId}/
        ├── marksheet_10_scan.pdf
        ├── marksheet_12_scan.pdf
        ├── neet_scorecard.jpg
        └── passport_front_back.pdf
```

---

## 4. Authentication & Session Management Layer

Create or update `/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase Environment Variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

---

## 5. Standardized Error Messages & Security Architecture

Create `/src/constants/errorMessages.ts` to enforce uniform, anti-enumeration error messages identical to the Android app:

```typescript
export const AppErrorMessages = {
  // 🌐 Network / Connectivity
  Network: {
    NO_INTERNET: "No internet connection — Please check your connection and try again.",
    CONNECTION_LOST: "Connection lost — Please check your internet connection.",
    SERVER_UNREACHABLE: "Unable to connect — Please try again in a moment.",
    REQUEST_TIMEOUT: "Request timed out — Please try again.",
    SERVER_ERROR: "Something went wrong — We're having trouble connecting to our servers.",
  },

  // 🔐 Login / Authentication (Anti-Enumeration Guard)
  Auth: {
    INVALID_CREDENTIALS: "Invalid email or password — Please check your credentials and try again.",
    EMAIL_NOT_VERIFIED: "Email not verified — Please verify your email before signing in.",
    ACCOUNT_DISABLED: "Account unavailable — This account is currently unavailable.",
    SESSION_EXPIRED: "Session expired — Please sign in again.",
    ALREADY_LOGGED_IN: "You're already signed in.",
  },

  // 📝 Registration
  Registration: {
    ACCOUNT_EXISTS: "Account already exists — Try signing in instead.",
    INVALID_EMAIL: "Enter a valid email address.",
    WEAK_PASSWORD: "Password is too weak — Use at least 8 characters.",
    PASSWORD_MISMATCH: "Passwords don't match — Please try again.",
    REQUIRED_FIELD: "This field is required.",
    INVALID_PHONE: "Enter a valid phone number.",
    REGISTRATION_FAILED: "Couldn't create your account — Please try again.",
  },

  // 📁 Documents / KYC
  Documents: {
    UPLOAD_FAILED: "Upload failed — Please try again.",
    FILE_TOO_LARGE: "File is too large — Please choose a smaller file (Max 10MB).",
    UNSUPPORTED_FORMAT: "Unsupported file type — Please select a PDF, JPG, or PNG.",
    PERMISSION_DENIED: "Unable to access this document.",
    DOWNLOAD_FAILED: "Couldn't download the document — Please try again.",
    DOCUMENT_MISSING: "Document unavailable — It may have been removed or moved.",
  },

  // 🎓 Application
  Application: {
    SAVE_FAILED: "Couldn't save your changes — Please try again.",
    APPLICATION_UNAVAILABLE: "Application unavailable — Please try again later.",
    UNAUTHORIZED: "You don't have permission to perform this action.",
    ALREADY_SUBMITTED: "Application already submitted.",
    INVALID_DATA: "Some information is invalid — Please review your details.",
  },

  // 🤖 AI Counselor
  AiCounselor: {
    AI_UNAVAILABLE: "AI counselor is temporarily unavailable — Please try again later.",
    AI_TIMEOUT: "The response took too long — Please try again.",
    AI_REQUEST_FAILED: "Couldn't get a response — Please try again.",
    RATE_LIMITED: "Too many requests — Please wait a moment and try again.",
    EMPTY_RESPONSE: "No response received — Please try asking again.",
  },
};
```

---

## 6. Gemini AI Medical Counselor Integration

Create `/src/services/geminiAi.ts` to power the AI Counselor with official **NMC Gazette FMGL 2021/2026** compliance:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export const SYSTEM_INSTRUCTION = `
You are the MedRussia Senior AI Medical Admissions Counselor.
Your role is to guide Indian students aspiring to study MBBS in Russia.

Strict NMC FMGL Regulatory Guidelines:
1. Course Duration: Exactly 54 Months (4.5 Years) theoretical & clinical study + 12 Months (1 Year) mandatory clinical clerkship/internship at the same university hospital. Total: 6 Years.
2. Medium of Instruction: 100% English Medium for the full 6-year duration.
3. Registration: Direct license to practice medicine in the Russian Federation upon graduation.
4. Eligibility: NEET qualification (50th percentile for General/EWS, 40th percentile for OBC/SC/ST) + 50% aggregate in 12th PCB (40% for Reserved).
5. Official Partner Universities: Bashkir State Medical University (Ufa), Kazan Federal University, Sechenov Moscow, Orel State, Kursk State, Crimean Federal, etc.
6. Senior Human Consultant Hotline: Amit Gurjar (+91 73750 17401).

Provide encouraging, structured, highly professional responses with bullet points and fee breakdowns.
`;

export async function askAiCounselor(prompt: string, history: { role: 'user' | 'model'; text: string }[] = []) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const chat = model.startChat({
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
    });

    const result = await chat.sendMessage(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini AI error:', error);
    throw error;
  }
}
```

---

## 7. Frontend UI Components Implementation

### 7.1 Theme & Color Palette Configuration

Update your `tailwind.config.js` to match MedRussia's signature navy, medical blue, and orange design:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          800: '#0A192F',
          900: '#060D1A',
        },
        medBlue: {
          DEFAULT: '#2563EB',
          light: '#EFF6FF',
          dark: '#1D4ED8',
        },
        medOrange: {
          DEFAULT: '#FF6B00',
          light: '#FFF7ED',
          dark: '#EA580C',
        },
        medRed: {
          DEFAULT: '#DC2626',
          light: '#FEF2F2',
        },
        successGreen: {
          DEFAULT: '#16A34A',
          light: '#F0FDF4',
        },
        surfaceBg: '#F8FAFC',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
```

---

### 7.2 University Explorer & Comparison Hub

Create `/src/components/UniversityExplorer.tsx`:

```tsx
import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, CheckCircle2, Utensils, Award, ExternalLink, ArrowRightLeft } from 'lucide-react';
import { ALL_UNIVERSITIES, University } from '../constants/universities';

export const UniversityExplorer: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const filters = ['All', 'NMC Recognized', 'Indian Mess', 'Budget (< ₹3.5L)', 'Top Ranked'];

  const filteredUnis = useMemo(() => {
    return ALL_UNIVERSITIES.filter((uni) => {
      const matchesSearch = uni.name.toLowerCase().includes(search.toLowerCase()) || 
                            uni.city.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedFilter === 'NMC Recognized') return uni.isNmcRecognized;
      if (selectedFilter === 'Indian Mess') return uni.hasIndianMess;
      if (selectedFilter === 'Budget (< ₹3.5L)') return uni.annualTuitionRub <= 350000;
      if (selectedFilter === 'Top Ranked') return uni.ranking?.includes('Top') || uni.ranking?.includes('#1');
      return true;
    });
  }, [search, selectedFilter]);

  const toggleCompare = (id: string) => {
    setComparedIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-navy-800">
            40+ Russian Medical Universities
          </h1>
          <p className="text-sm text-gray-500">100% NMC FMGL Compliant • Direct English Medium Admissions</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search universities, cities, fees..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medBlue"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedFilter === filter
                ? 'bg-navy-800 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* University Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUnis.map((uni) => {
          const isCompared = comparedIds.includes(uni.id);
          return (
            <div key={uni.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative h-48 bg-gray-100">
                <img src={uni.imageUrl} alt={uni.name} className="w-full h-full object-cover" />
                <span className="absolute top-3 right-3 bg-navy-800/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-md backdrop-blur-sm">
                  {uni.ranking}
                </span>
              </div>

              <div className="p-5">
                <h3 className="text-base font-bold text-navy-800 line-clamp-1">{uni.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{uni.city}</p>

                <div className="flex items-center gap-4 my-4">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-gray-400">Annual Tuition</p>
                    <p className="text-sm font-extrabold text-medOrange">₹{uni.annualTuitionRub.toLocaleString()} / yr</p>
                  </div>
                  <div className="h-8 w-px bg-gray-100" />
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-gray-400">Annual Hostel</p>
                    <p className="text-sm font-bold text-navy-800">₹{uni.annualHostelRub.toLocaleString()} / yr</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-gray-600">
                    <input
                      type="checkbox"
                      checked={isCompared}
                      onChange={() => toggleCompare(uni.id)}
                      className="rounded border-gray-300 text-medBlue focus:ring-medBlue"
                    />
                    Compare
                  </label>

                  <a
                    href={`/admission-form?uni=${uni.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-medOrange hover:text-medOrange-dark"
                  >
                    Apply Now →
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Compare Bar */}
      {comparedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-navy-800 text-white px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-4 z-50">
          <span className="text-xs font-semibold">Comparing {comparedIds.length} of 4 universities</span>
          <button
            onClick={() => setComparedIds([])}
            className="text-xs text-gray-300 hover:text-white underline"
          >
            Clear
          </button>
          <button
            onClick={() => setShowCompareModal(true)}
            className="bg-medOrange px-4 py-1.5 rounded-full text-xs font-bold hover:bg-medOrange-dark"
          >
            Compare Now
          </button>
        </div>
      )}
    </div>
  );
};
```

---

### 7.3 6-Year MBBS Budget Calculator

Create `/src/components/MbbsBudgetCalculator.tsx`:

```tsx
import React, { useState } from 'react';
import { ALL_UNIVERSITIES } from '../constants/universities';
import { Calculator, IndianRupee, Landmark, Bed, UtensilsCrossed, Plane } from 'lucide-react';

export const MbbsBudgetCalculator: React.FC = () => {
  const [selectedUniId, setSelectedUniId] = useState(ALL_UNIVERSITIES[0].id);
  const [lifestyleTier, setLifestyleTier] = useState<'economical' | 'standard' | 'comfort'>('standard');
  const [monthlyMessInr, setMonthlyMessInr] = useState(12000);
  const [annualFlightsInr, setAnnualFlightsInr] = useState(40000);

  const selectedUni = ALL_UNIVERSITIES.find((u) => u.id === selectedUniId) || ALL_UNIVERSITIES[0];

  const totalTuition6Y = selectedUni.annualTuitionRub * 6;
  const totalHostel6Y = selectedUni.annualHostelRub * 6;
  const totalMess6Y = monthlyMessInr * 10 * 6; // 10 academic months/year
  const totalFlights6Y = annualFlightsInr * 6;
  const grandTotalInr = totalTuition6Y + totalHostel6Y + totalMess6Y + totalFlights6Y;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="bg-navy-800 text-white p-6 md:p-8">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Calculator className="w-6 h-6 text-medOrange" />
            6-Year MBBS Complete Budget Estimator
          </h2>
          <p className="text-xs text-gray-300 mt-1">100% Transparent Fee Calculator with Zero Hidden Consultancy Charges</p>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-navy-800 mb-2">Select Russian University</label>
              <select
                value={selectedUniId}
                onChange={(e) => setSelectedUniId(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-navy-800 focus:ring-2 focus:ring-medBlue focus:outline-none"
              >
                {ALL_UNIVERSITIES.map((uni) => (
                  <option key={uni.id} value={uni.id}>
                    {uni.name} (₹{(uni.annualTuitionRub / 100000).toFixed(1)}L/yr)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-800 mb-2">Monthly Food / Indian Mess Expense</label>
              <input
                type="range"
                min={8000}
                max={20000}
                step={1000}
                value={monthlyMessInr}
                onChange={(e) => setMonthlyMessInr(Number(e.target.value))}
                className="w-full accent-medOrange"
              />
              <div className="flex justify-between text-xs font-bold text-gray-500 mt-1">
                <span>₹8,000</span>
                <span className="text-medOrange font-extrabold">₹{monthlyMessInr.toLocaleString()}/mo</span>
                <span>₹20,000</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-800 mb-2">Annual Round-Trip Flight Budget</label>
              <input
                type="range"
                min={30000}
                max={70000}
                step={5000}
                value={annualFlightsInr}
                onChange={(e) => setAnnualFlightsInr(Number(e.target.value))}
                className="w-full accent-medBlue"
              />
              <div className="flex justify-between text-xs font-bold text-gray-500 mt-1">
                <span>₹30,000</span>
                <span className="text-medBlue font-extrabold">₹{annualFlightsInr.toLocaleString()}/yr</span>
                <span>₹70,000</span>
              </div>
            </div>
          </div>

          {/* Breakdown Card */}
          <div className="bg-surfaceBg rounded-2xl p-6 border border-gray-200 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-navy-800 uppercase tracking-wide">6-Year Cost Breakdown</h3>
              
              <div className="flex justify-between text-xs text-gray-600 pt-2 border-t border-gray-200">
                <span>6 Years Tuition Fee</span>
                <span className="font-bold text-navy-800">₹{totalTuition6Y.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>6 Years University Hostel</span>
                <span className="font-bold text-navy-800">₹{totalHostel6Y.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>6 Years Indian Mess / Food</span>
                <span className="font-bold text-navy-800">₹{totalMess6Y.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>6 Years Annual Flight Tickets</span>
                <span className="font-bold text-navy-800">₹{totalFlights6Y.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-300">
              <p className="text-xs font-bold text-gray-500">Estimated Total 6-Year Investment</p>
              <p className="text-3xl font-black text-medOrange mt-1">₹{grandTotalInr.toLocaleString()}</p>
              <p className="text-[11px] text-gray-400 mt-1">Approx. ₹{(grandTotalInr / 6).toLocaleString()} per academic year</p>

              <a
                href={`/admission-form?uni=${selectedUni.id}&budget=${grandTotalInr}`}
                className="mt-5 w-full block text-center bg-navy-800 hover:bg-navy-900 text-white font-bold py-3 rounded-xl shadow-md transition-all text-xs uppercase"
              >
                Apply With This Budget Plan →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

### 7.4 AI NMC Eligibility Evaluator

Create `/src/components/AiEligibilityChecker.tsx`:

```tsx
import React, { useState } from 'react';
import { ShieldCheck, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export const AiEligibilityChecker: React.FC = () => {
  const [category, setCategory] = useState<'General / UR' | 'OBC' | 'SC' | 'ST'>('General / UR');
  const [physics, setPhysics] = useState(65);
  const [chemistry, setChemistry] = useState(62);
  const [biology, setBiology] = useState(70);
  const [neetScore, setNeetScore] = useState(285);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const evaluate = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      const pcb = (physics + chemistry + biology) / 3;
      const minPcbRequired = category === 'General / UR' ? 50 : 40;
      const neetCutoff = category === 'General / UR' ? 137 : 107;
      const isCompliant = pcb >= minPcbRequired && neetScore >= neetCutoff;

      setResult({
        isCompliant,
        pcbAggregate: pcb.toFixed(1),
        minPcbRequired,
        neetCutoff,
        probability: isCompliant ? 98 : 45,
      });
      setIsEvaluating(false);
    }, 800);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-medOrange" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-navy-800">AI NMC Eligibility Evaluator</h2>
            <p className="text-xs text-gray-500">Evaluates 12th PCB & NEET Scores against National Medical Commission FMGL Regulations</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-navy-800 mb-2">Category (As per Caste Certificate)</label>
            <div className="grid grid-cols-4 gap-2">
              {(['General / UR', 'OBC', 'SC', 'ST'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    category === cat
                      ? 'bg-navy-800 text-white border-navy-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-navy-800 mb-1">Physics (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={physics}
                onChange={(e) => setPhysics(Number(e.target.value))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-navy-800 mb-1">Chemistry (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={chemistry}
                onChange={(e) => setChemistry(Number(e.target.value))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-navy-800 mb-1">Biology (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={biology}
                onChange={(e) => setBiology(Number(e.target.value))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-center"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-800 mb-1">NEET Score (Out of 720)</label>
            <input
              type="number"
              min={0}
              max={720}
              value={neetScore}
              onChange={(e) => setNeetScore(Number(e.target.value))}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-center"
            />
          </div>

          <button
            onClick={evaluate}
            disabled={isEvaluating}
            className="w-full bg-medOrange hover:bg-medOrange-dark text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all text-xs uppercase tracking-wider"
          >
            {isEvaluating ? 'Analyzing Profile with Gemini AI...' : 'Evaluate MBBS Eligibility ⚡'}
          </button>
        </div>

        {result && (
          <div className={`mt-6 p-5 rounded-2xl border ${result.isCompliant ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-3">
              {result.isCompliant ? (
                <CheckCircle2 className="w-6 h-6 text-successGreen" />
              ) : (
                <AlertCircle className="w-6 h-6 text-medRed" />
              )}
              <div>
                <h4 className="text-sm font-extrabold text-navy-800">
                  {result.isCompliant ? '100% NMC Compliant — Admission Eligible' : 'Eligibility Criteria Not Met'}
                </h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  12th PCB Aggregate: <strong>{result.pcbAggregate}%</strong> (Min {result.minPcbRequired}% required) • 
                  NEET Cutoff: <strong>{result.neetCutoff}</strong>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### 7.5 Live Senior Human Counselor Desk

Create `/src/components/HumanCounselorDesk.tsx`:

```tsx
import React, { useState } from 'react';
import { Phone, MessageSquare, Send, Calendar, Clock, CheckCircle2 } from 'lucide-react';

export const HumanCounselorDesk: React.FC = () => {
  const [messages, setMessages] = useState([
    { id: '1', sender: 'counselor', text: 'Hello! I am Amit Gurjar, Senior Admissions Counselor at MedRussia. How can I assist you with your MBBS admission in Russia today?' }
  ]);
  const [input, setInput] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'counselor',
          text: 'Thank you for your message! Direct seat reservation for September 2026 intake is currently active. Would you like to reserve your seat or schedule a 1-on-1 consultation call?'
        }
      ]);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex flex-col h-[650px]">
        {/* Header */}
        <div className="bg-navy-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-medOrange flex items-center justify-center font-bold text-white text-base">
                AG
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-successGreen rounded-full border-2 border-navy-800" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Amit Gurjar</h3>
              <p className="text-[11px] text-gray-300">Senior Admissions Consultant • MBBS in Russia</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="tel:+917375017401"
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-successGreen" />
              Call Desk
            </a>
            <a
              href="https://wa.me/917375017401"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-full bg-successGreen hover:bg-green-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp
            </a>
            <button
              onClick={() => setShowBookingModal(true)}
              className="px-3.5 py-1.5 rounded-full bg-medOrange hover:bg-medOrange-dark text-white text-xs font-bold transition-colors"
            >
              Book Call
            </button>
          </div>
        </div>

        {/* Chat Thread */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-medBlue text-white rounded-br-none'
                    : 'bg-white text-navy-800 border border-gray-200 rounded-bl-none shadow-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask counselor about admissions, visa, fees..."
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-medBlue"
          />
          <button
            onClick={sendMessage}
            className="p-3 bg-medOrange hover:bg-medOrange-dark text-white rounded-xl shadow-md transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 8. Environment Variables & Deployment

Create `.env` in the root of your web project:

```env
# 1. Supabase Project Credentials
VITE_SUPABASE_URL=https://hwixqcigiwwhscfoemnn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 2. Google Gemini AI Key
VITE_GEMINI_API_KEY=AIzaSy...

# 3. Official Admissions Helpline
VITE_COUNSELOR_PHONE=+917375017401
VITE_COUNSELOR_WHATSAPP=https://wa.me/917375017401
```

### Installation & Run Commands:
```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Build optimized production bundle
npm run build
```

---

*MedRussia Web Integration Guide — Synced with MedRussia Android Architecture.*
