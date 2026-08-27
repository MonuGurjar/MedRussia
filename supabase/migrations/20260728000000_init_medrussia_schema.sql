-- MedRussia Supabase Text Data Storing & Auth Schema Migration

-- 1. Public Users Table (Linked to auth.users for identity & auth profile data)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  neet_score TEXT,
  budget TEXT,
  shortlisted_universities JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '{}'::jsonb,
  notifications JSONB DEFAULT '[]'::jsonb,
  eligibility_data JSONB DEFAULT '{}'::jsonb,
  eligibility_result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Student Inquiries & Counselor Replies Table (Text Storage)
CREATE TABLE IF NOT EXISTS public.inquiries (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  university TEXT,
  target_university TEXT,
  message TEXT NOT NULL,
  budget TEXT,
  current_status TEXT,
  status TEXT DEFAULT 'pending',
  replies JSONB DEFAULT '[]'::jsonb,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Direct Student-Counselor Chat Sessions Table (Text Storage)
CREATE TABLE IF NOT EXISTS public.direct_chats (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at BIGINT NOT NULL,
  last_message_at BIGINT NOT NULL,
  status TEXT DEFAULT 'open',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Platform Reviews & Feedback Table (Text Storage)
CREATE TABLE IF NOT EXISTS public.platform_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT NOT NULL,
  rating INT NOT NULL,
  category TEXT NOT NULL,
  comment TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Key-Value Store Table (Global Settings, Chat Logs, Backups)
CREATE TABLE IF NOT EXISTS public.kv_store (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Guest AI Rate Limit Stats Table
CREATE TABLE IF NOT EXISTS public.guest_ai_stats (
  id TEXT PRIMARY KEY,
  ip_address TEXT NOT NULL,
  date DATE NOT NULL,
  count INT DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all text storage tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kv_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_ai_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Public read kv_store" ON public.kv_store;
DROP POLICY IF EXISTS "Admin write kv_store" ON public.kv_store;
DROP POLICY IF EXISTS "Users read own inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Users insert inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Users read own direct chats" ON public.direct_chats;
DROP POLICY IF EXISTS "Public read platform feedback" ON public.platform_feedback;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

-- Users Table RLS Policies
CREATE POLICY "Users can read own profile" ON public.users 
  FOR SELECT USING (auth.uid() = id OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin', 'staff', 'manager'));

CREATE POLICY "Users can update own profile" ON public.users 
  FOR UPDATE USING (auth.uid() = id OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

CREATE POLICY "Users can insert own profile" ON public.users 
  FOR INSERT WITH CHECK (auth.uid() = id OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

-- Inquiries Table RLS Policies
CREATE POLICY "Users read own inquiries" ON public.inquiries
  FOR SELECT USING (auth.uid() = user_id OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin', 'staff', 'manager'));

CREATE POLICY "Users insert inquiries" ON public.inquiries
  FOR INSERT WITH CHECK (true);

-- Direct Chats RLS Policies
CREATE POLICY "Users read own direct chats" ON public.direct_chats
  FOR SELECT USING (auth.uid()::text = student_id OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin', 'staff', 'manager'));

-- Platform Feedback RLS Policies
CREATE POLICY "Public read platform feedback" ON public.platform_feedback FOR SELECT USING (true);
CREATE POLICY "Public insert platform feedback" ON public.platform_feedback FOR INSERT WITH CHECK (true);

-- KV Store RLS Policies
CREATE POLICY "Public read kv_store" ON public.kv_store FOR SELECT USING (true);
CREATE POLICY "Admin write kv_store" ON public.kv_store FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

-- Audit Logs RLS Policies
CREATE POLICY "Admins can view audit logs" ON public.audit_logs 
  FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

