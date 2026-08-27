-- =========================================================================
-- MEDRUSSIA SECURITY FIXES & CONSISTENCY MIGRATION
-- 1. Canonical vault_documents table
-- 2. Private kyc-vault Storage RLS policies
-- 3. Application status protection trigger for students
-- 4. Platform feedback private read RLS
-- 5. Audit logs lockdown RLS
-- =========================================================================

-- 1. Canonical public.vault_documents table
CREATE TABLE IF NOT EXISTS public.vault_documents (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, -- 'marksheet_10', 'marksheet_12', 'marksheet', 'passport', 'neet_scorecard', 'neetScoreCard', 'medical_fitness', 'admission_letter', 'invitation_letter', 'visa', 'flight_ticket'
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Stores private Storage object path: students/{userId}/{docType}_{fileName}
  file_size TEXT,
  status TEXT DEFAULT 'uploaded', -- 'uploaded', 'under_review', 'verified', 'rejected', 'issued', 'available', 'processing'
  is_issued_by_admin BOOLEAN DEFAULT FALSE,
  issued_at TIMESTAMPTZ,
  ref_number TEXT,
  issuing_authority TEXT,
  reviewer_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_documents_user_id ON public.vault_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_documents_doc_type ON public.vault_documents(doc_type);

ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vault: Select own" ON public.vault_documents;
DROP POLICY IF EXISTS "Vault: Insert own" ON public.vault_documents;
DROP POLICY IF EXISTS "Vault: Update own" ON public.vault_documents;
DROP POLICY IF EXISTS "Vault: Delete own" ON public.vault_documents;
DROP POLICY IF EXISTS "Students can view own documents" ON public.vault_documents;
DROP POLICY IF EXISTS "Students can upload own documents" ON public.vault_documents;
DROP POLICY IF EXISTS "Students can update own documents" ON public.vault_documents;

-- Student RLS: Read, Upload, Update, Delete ONLY own documents
CREATE POLICY "Vault: Select own" ON public.vault_documents
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'admin', 'staff', 'super_admin'))
  );

CREATE POLICY "Vault: Insert own" ON public.vault_documents
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'admin', 'staff', 'super_admin'))
  );

CREATE POLICY "Vault: Update own" ON public.vault_documents
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'admin', 'staff', 'super_admin'))
  );

CREATE POLICY "Vault: Delete own" ON public.vault_documents
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'admin', 'staff', 'super_admin'))
  );


-- 2. PRIVATE STORAGE POLICIES FOR kyc-vault
-- Ensure kyc-vault bucket exists and is set to private (public = false)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kyc-vault', 'kyc-vault', false, 15728640, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage object policies enforcing student user-folder ownership
DROP POLICY IF EXISTS "KYC: Student Upload Own Folder" ON storage.objects;
DROP POLICY IF EXISTS "KYC: Student Read Own Folder" ON storage.objects;
DROP POLICY IF EXISTS "KYC: Student Delete Own Folder" ON storage.objects;

CREATE POLICY "KYC: Student Upload Own Folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'kyc-vault' AND
    auth.uid() IS NOT NULL AND
    (
      (storage.foldername(name))[2] = auth.uid()::text OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'admin', 'staff', 'super_admin'))
    )
  );

CREATE POLICY "KYC: Student Read Own Folder" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'kyc-vault' AND
    auth.uid() IS NOT NULL AND
    (
      (storage.foldername(name))[2] = auth.uid()::text OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'admin', 'staff', 'super_admin'))
    )
  );

CREATE POLICY "KYC: Student Delete Own Folder" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'kyc-vault' AND
    auth.uid() IS NOT NULL AND
    (
      (storage.foldername(name))[2] = auth.uid()::text OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'admin', 'staff', 'super_admin'))
    )
  );


-- 3. APPLICATION STATUS PROTECTION TRIGGER
-- Prevents non-admin students from modifying application_status or current_step
CREATE OR REPLACE FUNCTION public.protect_application_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If application_status or current_step is being altered
  IF (OLD.application_status IS DISTINCT FROM NEW.application_status OR OLD.current_step IS DISTINCT FROM NEW.current_step) THEN
    -- Allow change ONLY IF executing user has an admin/staff role
    IF NOT EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'admin', 'staff', 'super_admin')
    ) THEN
      -- Revert privileged fields to their existing database values
      NEW.application_status := OLD.application_status;
      NEW.current_step := OLD.current_step;
    END IF;
  END IF;

  -- Ensure ownership cannot be transferred to another user
  IF (OLD.user_id IS DISTINCT FROM NEW.user_id) THEN
    NEW.user_id := OLD.user_id;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_application_status ON public.applications;
CREATE TRIGGER trg_protect_application_status
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.protect_application_status();


-- 4. PLATFORM FEEDBACK — REMOVE PUBLIC READ ACCESS
ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Feedback: Public Select" ON public.platform_feedback;
DROP POLICY IF EXISTS "Feedback: Public Insert" ON public.platform_feedback;
DROP POLICY IF EXISTS "Feedback: Owner Select" ON public.platform_feedback;
DROP POLICY IF EXISTS "Feedback: Select Own" ON public.platform_feedback;
DROP POLICY IF EXISTS "Feedback: Authenticated Insert" ON public.platform_feedback;

-- Anyone authenticated can submit feedback
CREATE POLICY "Feedback: Authenticated Insert" ON public.platform_feedback
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (user_id = auth.uid()::text OR user_id IS NULL)
  );

-- Only owner can read own feedback, or Admin can read all feedback
CREATE POLICY "Feedback: Select Own" ON public.platform_feedback
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid()::text OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'admin', 'staff', 'super_admin'))
    )
  );


-- 5. AUDIT LOGS — LOCK DOWN SECURITY LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_update_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit: Admin Select" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit: Authenticated Insert Own" ON public.audit_logs;

-- Strictly Admins can view audit logs
CREATE POLICY "Audit: Admin Select" ON public.audit_logs
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'admin', 'staff', 'super_admin'))
  );

-- Authenticated users can only record legitimate client activity
CREATE POLICY "Audit: Authenticated Insert Own" ON public.audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (user_id = auth.uid()::text OR user_id IS NULL)
  );

-- Disallow all client updates and deletes on audit logs (Append-Only)
-- (No UPDATE or DELETE policies created -> default DENY)
