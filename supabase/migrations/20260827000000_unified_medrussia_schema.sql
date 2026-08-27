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
  username TEXT UNIQUE,
  phone TEXT,
  role TEXT DEFAULT 'STUDENT', -- 'STUDENT' or 'PARENT' or 'ADMIN'
  neet_score TEXT,
  budget TEXT,
  category TEXT DEFAULT 'General / UR',
  pcb_percentage TEXT,
  intake_batch TEXT DEFAULT 'September 2026 (Main)',
  shortlisted_universities JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '{}'::jsonb,
  notifications JSONB DEFAULT '[]'::jsonb,
  eligibility_data JSONB DEFAULT '{}'::jsonb,
  eligibility_result TEXT,
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
