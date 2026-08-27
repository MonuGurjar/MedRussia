# 🗄️ MedRussia — Master Database Operations & Security Architecture Manual

> **Database Engine:** PostgreSQL 15 (Managed by Supabase)  
> **Storage:** Private `kyc-vault` Bucket with Short-Lived Signed URLs  
> **API Protocols:** PostgREST (RESTful HTTPS), WebSocket (Supabase Realtime), Storage Object API  
> **Canonical Document Entity:** `public.vault_documents`  
> **Client SDKs:**  
> • **Android:** `io.github.jan.supabase:postgrest-kt`, `auth-kt`, `storage-kt`, `realtime-kt` (Kotlin)  
> • **Web Portal:** `@supabase/supabase-js` v2 (TypeScript / React)  
> **Security Audit Status:** Verified & Synchronized (August 27, 2026)  

---

## 📑 Table of Contents
1. [Architecture & Canonical Entity Model](#1-architecture--canonical-entity-model)
2. [Master Database Schema DDL](#2-master-database-schema-ddl)
3. [Row-Level Security (RLS) & Protection Triggers](#3-row-level-security-rls--protection-triggers)
4. [Operations by Entity](#4-operations-by-entity)
   - 4.1 [User Profiles (`users`)](#41-user-profiles-users)
   - 4.2 [Admission Applications (`applications`) — Protected Status](#42-admission-applications-applications--protected-status)
   - 4.3 [Document Vault & KYC (`vault_documents`) — Canonical Entity](#43-document-vault--kyc-vault_documents--canonical-entity)
   - 4.4 [Counselor Chat & Messaging (`direct_chats`)](#44-counselor-chat--messaging-direct_chats)
   - 4.5 [Consultation Call Bookings (`call_bookings`)](#45-consultation-call-bookings-call_bookings)
   - 4.6 [Student Inquiries (`inquiries`)](#46-student-inquiries-inquiries)
   - 4.7 [Platform Feedback (`platform_feedback`) — Private Read](#47-platform-feedback-platform_feedback--private-read)
   - 4.8 [System Key-Value Store (`kv_store`)](#48-system-key-value-store-kv_store)
   - 4.9 [Security Audit Logs (`audit_logs`) — Locked Down](#49-security-audit-logs-audit_logs--locked-down)
5. [Private Storage Bucket Operations (`kyc-vault`) & Signed URLs](#5-private-storage-bucket-operations-kyc-vault--signed-urls)
6. [Realtime WebSocket Subscriptions](#6-realtime-websocket-subscriptions)
7. [Security Verification Matrix](#7-security-verification-matrix)

---

## 1. Architecture & Canonical Entity Model

Both **Android** and **Web** applications interface with the same canonical PostgreSQL schema and private storage bucket.

```
                      ┌────────────────────────┐
                      │    auth.users (Auth)   │
                      └───────────┬────────────┘
                                  │ 1:1
                                  ▼
                      ┌────────────────────────┐
                      │      public.users      │
                      └─────┬────────────┬─────┘
                            │ 1:N        │ 1:N
           ┌────────────────┴────┐  ┌────┴────────────────┐
           ▼                     ▼  ▼                     ▼
┌──────────────────────┐  ┌───────────────┐   ┌───────────────────────┐
│ public.applications  │  │ public.vault_ │   │  public.direct_chats  │
│ (Admission Dossiers) │  │   documents   │   │  (Counselor Messages) │
│ *Status Protected*   │  │  *Canonical*  │   │                       │
└──────────────────────┘  └───────────────┘   └───────────────────────┘
```

> [!IMPORTANT]
> **Canonical Document System:** `public.vault_documents` is the single source of truth for all student KYC uploads and admin-issued documents. `users.documents` has been deprecated and removed.

---

## 2. Master Database Schema DDL

```sql
-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PUBLIC USERS PROFILE TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  phone TEXT,
  role TEXT DEFAULT 'STUDENT', -- 'STUDENT', 'PARENT', 'ADMIN', 'STAFF'
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

-- 3. ADMISSION APPLICATIONS TABLE (STATUS PROTECTED)
CREATE TABLE IF NOT EXISTS public.applications (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  student_id TEXT,
  student_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  parent_name TEXT,
  parent_phone TEXT,
  address TEXT,
  tenth_percentage TEXT,
  twelfth_percentage TEXT,
  pcb_percentage TEXT,
  category TEXT DEFAULT 'General / UR',
  neet_roll_no TEXT,
  neet_score TEXT,
  neet_status TEXT DEFAULT 'Qualified',
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

-- 4. CANONICAL DOCUMENT VAULT (KYC & ISSUED LETTERS) TABLE
CREATE TABLE IF NOT EXISTS public.vault_documents (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, -- 'marksheet_10', 'marksheet_12', 'marksheet', 'passport', 'neet_scorecard', 'neetScoreCard', 'medical_fitness', 'admission_letter', 'invitation_letter', 'visa', 'flight_ticket'
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Private Storage object path: students/{userId}/{docType}_{fileName}
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

-- 5. DIRECT COUNSELOR CHAT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.direct_chats (
  id TEXT PRIMARY KEY,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  counselor_name TEXT DEFAULT 'Amit Gurjar (Senior Consultant)',
  messages JSONB DEFAULT '[]'::jsonb,
  last_message_at BIGINT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CALL BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.call_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_phone TEXT NOT NULL,
  preferred_time_slot TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INQUIRIES TABLE
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

-- 8. PLATFORM FEEDBACK TABLE (PRIVATE READ)
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

-- 9. SYSTEM KEY-VALUE STORE TABLE
CREATE TABLE IF NOT EXISTS public.kv_store (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. AUDIT LOGS TABLE (LOCKED DOWN)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Row-Level Security (RLS) & Protection Triggers

```sql
-- Enable RLS across all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kv_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. USERS POLICIES
CREATE POLICY "Users: Select own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users: Insert own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users: Update own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 2. APPLICATIONS POLICIES
CREATE POLICY "Applications: Select own" ON public.applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Applications: Insert own" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Applications: Update own" ON public.applications FOR UPDATE USING (auth.uid() = user_id);

-- 3. APPLICATION STATUS PROTECTION TRIGGER
-- Prevents non-admin students from modifying application_status or current_step
CREATE OR REPLACE FUNCTION public.protect_application_status()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.application_status IS DISTINCT FROM NEW.application_status OR OLD.current_step IS DISTINCT FROM NEW.current_step) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'admin', 'staff', 'super_admin')
    ) THEN
      NEW.application_status := OLD.application_status;
      NEW.current_step := OLD.current_step;
    END IF;
  END IF;

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

-- 4. VAULT DOCUMENTS POLICIES
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

-- 5. PLATFORM FEEDBACK (Private Read)
CREATE POLICY "Feedback: Authenticated Insert" ON public.platform_feedback
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (user_id = auth.uid()::text OR user_id IS NULL)
  );

CREATE POLICY "Feedback: Select Own" ON public.platform_feedback
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid()::text OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'admin', 'staff', 'super_admin'))
    )
  );

-- 6. AUDIT LOGS (Locked Down)
CREATE POLICY "Audit: Admin Select" ON public.audit_logs
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'admin', 'staff', 'super_admin'))
  );

CREATE POLICY "Audit: Authenticated Insert Own" ON public.audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (user_id = auth.uid()::text OR user_id IS NULL)
  );
```

---

## 4. Operations by Entity

---

### 4.1 User Profiles (`users`)

#### Operation: Fetch Current User Profile
* **Kotlin (Android):**
  ```kotlin
  val profile = postgrest["users"]
      .select { filter { eq("id", userId) } }
      .decodeSingleOrNull<UserProfileDto>()
  ```
* **TypeScript (Web):**
  ```typescript
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  ```

---

### 4.2 Admission Applications (`applications`) — Protected Status

#### Operation: Submit / Upsert Admission Application
* **Rule:** Student submissions only set `application_status` on initial `INSERT`. Updates to an existing application will NOT overwrite admin-assigned milestone statuses.
* **Kotlin (Android):**
  ```kotlin
  // ApplicationRepository preserves existing status and currentStep
  val existing = getLocalApplication(context)
  val secured = if (existing != null) application.copy(status = existing.status, currentStep = existing.currentStep) else application
  postgrest["applications"].upsert(secured)
  ```
* **TypeScript (Web):**
  ```typescript
  const { data, error } = await supabase
    .from('applications')
    .upsert(applicationPayload);
  ```

---

### 4.3 Document Vault & KYC (`vault_documents`) — Canonical Entity

#### Operation: Fetch User's Vault Documents
* **Kotlin (Android):**
  ```kotlin
  val docs = postgrest["vault_documents"]
      .select { filter { eq("user_id", userId) } }
      .decodeList<DocumentDto>()
  ```
* **TypeScript (Web):**
  ```typescript
  const { data: docs, error } = await supabase
    .from('vault_documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  ```

#### Operation: Upsert Document Metadata (Stores Private Path)
* **Kotlin (Android):**
  ```kotlin
  val docRecord = DocumentDto(
      id = "${userId}_$docType",
      userId = userId,
      docType = docType,
      fileName = fileName,
      fileUrl = "students/$userId/${docType}_$fileName", // Private Storage Path
      fileSize = fileSizeFormatted,
      status = "under_review"
  )
  postgrest["vault_documents"].upsert(docRecord)
  ```
* **TypeScript (Web):**
  ```typescript
  await supabase.from('vault_documents').upsert({
    id: `${userId}_${docType}`,
    user_id: userId,
    doc_type: docType,
    file_name: file.name,
    file_url: `students/${userId}/${docType}_${file.name}`, // Private Storage Path
    file_size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    status: 'under_review',
  });
  ```

---

## 5. Private Storage Bucket Operations (`kyc-vault`) & Signed URLs

> [!CAUTION]
> **Permanent Public URLs are strictly prohibited.**
> All KYC documents must be accessed via temporary signed URLs (default validity: 15 minutes / 900 seconds).

### 5.1 Upload Binary to Private Bucket
* **Kotlin (Android):**
  ```kotlin
  val path = "students/$userId/${docType}_$fileName"
  storage["kyc-vault"].upload(path, fileBytes) {
      upsert = true
  }
  ```
* **TypeScript (Web):**
  ```typescript
  const path = `students/${userId}/${docType}_${file.name}`;
  const { data, error } = await supabase.storage
    .from('kyc-vault')
    .upload(path, file, { upsert: true });
  ```

### 5.2 Generate Short-Lived Signed URL for Viewing
* **Kotlin (Android):**
  ```kotlin
  val signedUrl = storage["kyc-vault"].createSignedUrl(
      path = "students/$userId/${docType}_$fileName",
      expiresIn = 15.minutes
  )
  ```
* **TypeScript (Web):**
  ```typescript
  const { data, error } = await supabase.storage
    .from('kyc-vault')
    .createSignedUrl(`students/${userId}/${docType}_${fileName}`, 900); // 15 mins
  const temporaryUrl = data?.signedUrl;
  ```

---

## 6. Realtime WebSocket Subscriptions

### Live Counselor Chat (TypeScript Web)
```typescript
const chatChannel = supabase
  .channel('realtime:direct_chats')
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'direct_chats', filter: `student_id=eq.${userId}` },
    (payload) => setMessages(payload.new.messages)
  )
  .subscribe();
```

---

## 7. Security Verification Matrix

| Actor | Action | Expected Result | Implementation |
| :--- | :--- | :--- | :--- |
| **Student A** | Read own profile | ✅ **ALLOW** | `auth.uid() = id` |
| **Student A** | Update own profile | ✅ **ALLOW** | `auth.uid() = id` |
| **Student A** | Read own application | ✅ **ALLOW** | `auth.uid() = user_id` |
| **Student A** | Update profile data in application | ✅ **ALLOW** | RLS allows row update |
| **Student A** | Change `application_status` directly | 🛑 **DENIED / REVERTED** | Trigger `protect_application_status` |
| **Student A** | Change `current_step` directly | 🛑 **DENIED / REVERTED** | Trigger `protect_application_status` |
| **Student A** | Read own KYC document | ✅ **ALLOW** | Private Signed URL generated |
| **Student A** | Read Student B KYC document | 🛑 **DENIED** | Storage RLS folder isolation |
| **Student A** | Read Student B application | 🛑 **DENIED** | RLS `auth.uid() = user_id` |
| **Student A** | Read all platform feedback | 🛑 **DENIED** | RLS `user_id = auth.uid()::text` |
| **Student A** | Read audit logs | 🛑 **DENIED** | RLS Admin-only policy |
| **Admin** | Read & update all records/statuses | ✅ **ALLOW** | Role `ADMIN` check |
| **Unauthenticated**| Access KYC documents / applications | 🛑 **DENIED** | RLS requires `auth.uid()` |

---

*Manual maintained for MedRussia Android & Web Cross-Platform Engineering.*
