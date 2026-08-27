# 🗄️ MedRussia — Complete Database Operations & API Reference Manual

> **Database Engine:** PostgreSQL 15 (Managed by Supabase)  
> **API Protocols:** PostgREST (RESTful HTTPS), WebSocket (Supabase Realtime), Storage Object API  
> **Client SDKs:**  
> • **Android:** `io.github.jan.supabase:postgrest-kt`, `auth-kt`, `storage-kt`, `realtime-kt` (Kotlin)  
> • **Web Portal:** `@supabase/supabase-js` v2 (TypeScript / React)  
> **Date:** August 27, 2026  

---

## 📑 Table of Contents
1. [Architecture & Entity Overview](#1-architecture--entity-overview)
2. [Database Schema DDL & Indexes](#2-database-schema-ddl--indexes)
3. [Row-Level Security (RLS) Policies](#3-row-level-security-rls-policies)
4. [Operations by Entity](#4-operations-by-entity)
   - 4.1 [User Profiles (`users`)](#41-user-profiles-users)
   - 4.2 [Admission Applications (`applications`)](#42-admission-applications-applications)
   - 4.3 [Document Vault & KYC (`vault_documents`)](#43-document-vault--kyc-vault_documents)
   - 4.4 [Counselor Chat & Messaging (`direct_chats`)](#44-counselor-chat--messaging-direct_chats)
   - 4.5 [Consultation Call Bookings (`call_bookings`)](#45-consultation-call-bookings-call_bookings)
   - 4.6 [Student Inquiries (`inquiries`)](#46-student-inquiries-inquiries)
   - 4.7 [Platform Feedback & Reviews (`platform_feedback`)](#47-platform-feedback--reviews-platform_feedback)
   - 4.8 [System Key-Value Store (`kv_store`)](#48-system-key-value-store-kv_store)
   - 4.9 [Security Audit Logs (`audit_logs`)](#49-security-audit-logs-audit_logs)
5. [Storage Bucket Operations (`kyc-vault`)](#5-storage-bucket-operations-kyc-vault)
6. [Realtime WebSocket Subscriptions](#6-realtime-websocket-subscriptions)
7. [Error Handling, Offline Caching & Fallback Patterns](#7-error-handling-offline-caching--fallback-patterns)

---

## 1. Architecture & Entity Overview

The MedRussia unified backend utilizes PostgreSQL 15 via Supabase, enforcing tenant isolation so students only access their own admissions data and documents.

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
└──────────────────────┘  └───────────────┘   └───────────────────────┘
```

---

## 2. Database Schema DDL & Indexes

```sql
-- =========================================================================
-- MEDRUSSIA MASTER DATABASE SCHEMA DDL
-- =========================================================================

-- 1. USERS PROFILE TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'STUDENT', -- 'STUDENT', 'PARENT', 'ADMIN'
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

-- 2. ADMISSION APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.applications (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  student_id TEXT, -- Legacy ID or Auth ID string
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

-- 3. DOCUMENT VAULT (KYC & ISSUED LETTERS) TABLE
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

-- 4. DIRECT COUNSELOR CHAT SESSIONS TABLE
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

-- 5. CALL BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.call_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_phone TEXT NOT NULL,
  preferred_time_slot TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INQUIRIES TABLE
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

-- 7. PLATFORM FEEDBACK TABLE
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

-- 8. SYSTEM KEY-VALUE STORE TABLE
CREATE TABLE IF NOT EXISTS public.kv_store (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- PERFORMANCE INDEXES
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_documents_user_id ON public.vault_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_direct_chats_student_id ON public.direct_chats(student_id);
CREATE INDEX IF NOT EXISTS idx_call_bookings_user_id ON public.call_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON public.inquiries(email);
```

---

## 3. Row-Level Security (RLS) Policies

All tables have RLS enabled to guarantee data isolation:

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

-- 1. USERS POLICIES
CREATE POLICY "Users: Select own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users: Insert own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users: Update own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 2. APPLICATIONS POLICIES
CREATE POLICY "Applications: Select own" ON public.applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Applications: Insert own" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Applications: Update own" ON public.applications FOR UPDATE USING (auth.uid() = user_id);

-- 3. VAULT DOCUMENTS POLICIES
CREATE POLICY "Vault: Select own" ON public.vault_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Vault: Insert own" ON public.vault_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Vault: Update own" ON public.vault_documents FOR UPDATE USING (auth.uid() = user_id);

-- 4. DIRECT CHATS POLICIES
CREATE POLICY "Chats: Select own" ON public.direct_chats FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Chats: Insert own" ON public.direct_chats FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Chats: Update own" ON public.direct_chats FOR UPDATE USING (auth.uid() = student_id);

-- 5. CALL BOOKINGS POLICIES
CREATE POLICY "Bookings: Full access own" ON public.call_bookings FOR ALL USING (auth.uid() = user_id);

-- 6. FEEDBACK & INQUIRIES (Public Submissions Allowed)
CREATE POLICY "Inquiries: Public Insert" ON public.inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Inquiries: Owner Select" ON public.inquiries FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Feedback: Public Insert" ON public.platform_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Feedback: Public Select" ON public.platform_feedback FOR SELECT USING (true);

-- 7. KV STORE (Read-Only Public for system configs)
CREATE POLICY "KV: Public Select" ON public.kv_store FOR SELECT USING (true);
```

---

## 4. Operations by Entity

---

### 4.1 User Profiles (`users`)

#### Operation: Fetch Current User Profile
* **SQL:**
  ```sql
  SELECT * FROM public.users WHERE id = :userId LIMIT 1;
  ```
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

#### Operation: Create or Upsert User Profile
* **SQL:**
  ```sql
  INSERT INTO public.users (id, email, name, phone, role)
  VALUES (:id, :email, :name, :phone, :role)
  ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    phone = EXCLUDED.phone, 
    updated_at = NOW();
  ```
* **Kotlin (Android):**
  ```kotlin
  val user = UserProfileDto(id = userId, email = email, name = name, phone = phone)
  postgrest["users"].upsert(user)
  ```
* **TypeScript (Web):**
  ```typescript
  const { data, error } = await supabase
    .from('users')
    .upsert({ id: userId, email, name, phone, updated_at: new Date().toISOString() });
  ```

---

### 4.2 Admission Applications (`applications`)

#### Operation: Submit / Upsert Admission Application
* **SQL:**
  ```sql
  INSERT INTO public.applications (
    id, user_id, student_name, email, phone, selected_university_id, intake_batch, 
    tenth_percentage, twelfth_percentage, neet_score, neet_year, needs_hostel, needs_indian_mess, application_status, current_step
  ) VALUES (
    :id, :userId, :studentName, :email, :phone, :selectedUniversityId, :intakeBatch,
    :tenthPct, :twelfthPct, :neetScore, :neetYear, :needsHostel, :needsIndianMess, 'APPLIED', 2
  ) ON CONFLICT (id) DO UPDATE SET
    selected_university_id = EXCLUDED.selected_university_id,
    updated_at = NOW();
  ```
* **Kotlin (Android):**
  ```kotlin
  postgrest["applications"].upsert(applicationDto)
  ```
* **TypeScript (Web):**
  ```typescript
  const { data, error } = await supabase
    .from('applications')
    .upsert(applicationData);
  ```

#### Operation: Get Student Active Application
* **SQL:**
  ```sql
  SELECT * FROM public.applications 
  WHERE user_id = :userId 
  ORDER BY created_at DESC LIMIT 1;
  ```
* **Kotlin (Android):**
  ```kotlin
  val app = postgrest["applications"]
      .select { filter { eq("user_id", userId) } }
      .decodeSingleOrNull<ApplicationDto>()
  ```
* **TypeScript (Web):**
  ```typescript
  const { data: application, error } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  ```

#### Operation: Update Admission Milestone Status
* **SQL:**
  ```sql
  UPDATE public.applications 
  SET application_status = :newStatus, current_step = :newStep, updated_at = NOW() 
  WHERE id = :appId;
  ```
* **Kotlin (Android):**
  ```kotlin
  postgrest["applications"].update({
      set("application_status", newStatus)
      set("current_step", newStep)
      set("updated_at", Clock.System.now().toString())
  }) { filter { eq("id", appId) } }
  ```
* **TypeScript (Web):**
  ```typescript
  const { data, error } = await supabase
    .from('applications')
    .update({ application_status: newStatus, current_step: newStep, updated_at: new Date().toISOString() })
    .eq('id', appId);
  ```

---

### 4.3 Document Vault & KYC (`vault_documents`)

#### Operation: Get User's Uploaded Documents
* **SQL:**
  ```sql
  SELECT * FROM public.vault_documents WHERE user_id = :userId ORDER BY created_at ASC;
  ```
* **Kotlin (Android):**
  ```kotlin
  val docs = postgrest["vault_documents"]
      .select { filter { eq("user_id", userId) } }
      .decodeList<DocumentDto>()
  ```
* **TypeScript (Web):**
  ```typescript
  const { data: documents, error } = await supabase
    .from('vault_documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  ```

#### Operation: Register Document Metadata after Storage Upload
* **SQL:**
  ```sql
  INSERT INTO public.vault_documents (id, user_id, doc_type, file_name, file_url, file_size, status)
  VALUES (:id, :userId, :docType, :fileName, :fileUrl, :fileSize, 'under_review')
  ON CONFLICT (id) DO UPDATE SET file_url = EXCLUDED.file_url, file_size = EXCLUDED.file_size, updated_at = NOW();
  ```
* **Kotlin (Android):**
  ```kotlin
  val doc = DocumentDto(id = "${userId}_$docType", userId = userId, docType = docType, fileName = fileName, fileUrl = fileUrl, fileSize = fileSize, status = "under_review")
  postgrest["vault_documents"].upsert(doc)
  ```
* **TypeScript (Web):**
  ```typescript
  const { data, error } = await supabase
    .from('vault_documents')
    .upsert({
      id: `${userId}_${docType}`,
      user_id: userId,
      doc_type: docType,
      file_name: fileName,
      file_url: fileUrl,
      file_size: fileSize,
      status: 'under_review',
    });
  ```

---

### 4.4 Counselor Chat & Messaging (`direct_chats`)

#### Operation: Fetch Conversation Thread
* **SQL:**
  ```sql
  SELECT * FROM public.direct_chats WHERE student_id = :studentId LIMIT 1;
  ```
* **Kotlin (Android):**
  ```kotlin
  val chat = postgrest["direct_chats"]
      .select { filter { eq("student_id", studentId) } }
      .decodeSingleOrNull<DirectChatDto>()
  ```
* **TypeScript (Web):**
  ```typescript
  const { data: chat, error } = await supabase
    .from('direct_chats')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();
  ```

#### Operation: Append Message to Conversation
* **SQL:**
  ```sql
  UPDATE public.direct_chats
  SET messages = messages || :newMessageJson::jsonb,
      last_message_at = :timestampMs,
      updated_at = NOW()
  WHERE student_id = :studentId;
  ```
* **TypeScript (Web):**
  ```typescript
  const { data, error } = await supabase
    .from('direct_chats')
    .update({
      messages: [...existingMessages, newMessage],
      last_message_at: Date.now(),
      updated_at: new Date().toISOString(),
    })
    .eq('student_id', studentId);
  ```

---

### 4.5 Consultation Call Bookings (`call_bookings`)

#### Operation: Schedule 1-on-1 Counselor Consultation
* **SQL:**
  ```sql
  INSERT INTO public.call_bookings (user_id, student_name, student_phone, preferred_time_slot, status)
  VALUES (:userId, :studentName, :studentPhone, :preferredTimeSlot, 'pending');
  ```
* **Kotlin (Android):**
  ```kotlin
  postgrest["call_bookings"].insert(CallBookingDto(
      userId = userId,
      studentName = studentName,
      studentPhone = phone,
      preferredTimeSlot = slot,
      status = "pending"
  ))
  ```
* **TypeScript (Web):**
  ```typescript
  const { data, error } = await supabase
    .from('call_bookings')
    .insert({
      user_id: userId,
      student_name: studentName,
      student_phone: phone,
      preferred_time_slot: slot,
      status: 'pending',
    });
  ```

---

### 4.6 Student Inquiries (`inquiries`)

#### Operation: Submit Admission Inquiry
* **SQL:**
  ```sql
  INSERT INTO public.inquiries (id, user_id, name, email, phone, target_university, message, budget, timestamp)
  VALUES (:id, :userId, :name, :email, :phone, :targetUniversity, :message, :budget, :timestampMs);
  ```
* **TypeScript (Web):**
  ```typescript
  const { data, error } = await supabase
    .from('inquiries')
    .insert({
      id: `inq_${Date.now()}`,
      user_id: userId || null,
      name,
      email,
      phone,
      target_university: targetUni,
      message,
      budget,
      timestamp: Date.now(),
    });
  ```

---

### 4.7 Platform Feedback & Reviews (`platform_feedback`)

#### Operation: Submit Student Rating & Review
* **SQL:**
  ```sql
  INSERT INTO public.platform_feedback (id, user_id, user_name, rating, category, comment, timestamp)
  VALUES (:id, :userId, :userName, :rating, :category, :comment, :timestampMs);
  ```
* **TypeScript (Web):**
  ```typescript
  const { data, error } = await supabase
    .from('platform_feedback')
    .insert({
      id: `fb_${Date.now()}`,
      user_id: userId,
      user_name: userName,
      rating,
      category,
      comment,
      timestamp: Date.now(),
    });
  ```

---

### 4.8 System Key-Value Store (`kv_store`)

#### Operation: Get Global System Configuration / Announcement
* **SQL:**
  ```sql
  SELECT value FROM public.kv_store WHERE key = :configKey LIMIT 1;
  ```
* **TypeScript (Web):**
  ```typescript
  const { data, error } = await supabase
    .from('kv_store')
    .select('value')
    .eq('key', 'intake_announcement_2026')
    .single();
  ```

---

### 4.9 Security Audit Logs (`audit_logs`)

#### Operation: Record Sensitive Student Action
* **SQL:**
  ```sql
  INSERT INTO public.audit_logs (user_id, action, details, ip_address)
  VALUES (:userId, :action, :detailsJson::jsonb, :ipAddress);
  ```
* **TypeScript (Web):**
  ```typescript
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'UPLOAD_PASSPORT_SCAN',
    details: { file_name: 'passport_scan.pdf' },
  });
  ```

---

## 5. Storage Bucket Operations (`kyc-vault`)

### 5.1 Upload Document Binary to Bucket
* **Bucket Name:** `kyc-vault`
* **File Path Pattern:** `students/{userId}/{docType}_{fileName}`
* **Kotlin (Android):**
  ```kotlin
  val bucket = storage["kyc-vault"]
  val path = "students/$userId/${docType}_$fileName"
  bucket.upload(path, fileBytes) {
      upsert = true
  }
  val publicUrl = bucket.publicUrl(path)
  ```
* **TypeScript (Web):**
  ```typescript
  const path = `students/${userId}/${docType}_${file.name}`;
  const { data, error } = await supabase.storage
    .from('kyc-vault')
    .upload(path, file, { upsert: true });

  const { data: urlData } = supabase.storage
    .from('kyc-vault')
    .getPublicUrl(path);
  ```

### 5.2 Delete Document from Bucket
* **Kotlin (Android):**
  ```kotlin
  storage["kyc-vault"].delete("students/$userId/${docType}_$fileName")
  ```
* **TypeScript (Web):**
  ```typescript
  await supabase.storage
    .from('kyc-vault')
    .remove([`students/${userId}/${docType}_${fileName}`]);
  ```

---

## 6. Realtime WebSocket Subscriptions

Realtime enables live updates for chat messages, document verification status, and milestone progression without manual polling.

### 6.1 Subscribe to Live Chat Messages (TypeScript Web)
```typescript
const channel = supabase
  .channel('realtime:direct_chats')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'direct_chats',
      filter: `student_id=eq.${userId}`,
    },
    (payload) => {
      const updatedMessages = payload.new.messages;
      setMessages(updatedMessages);
    }
  )
  .subscribe();

// Unsubscribe on unmount
return () => {
  supabase.removeChannel(channel);
};
```

### 6.2 Subscribe to Live Admission Progress Updates (TypeScript Web)
```typescript
const appChannel = supabase
  .channel('realtime:applications')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'applications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      setApplication(payload.new);
    }
  )
  .subscribe();
```

---

## 7. Error Handling, Offline Caching & Fallback Patterns

1. **Anti-Enumeration Login:** Never disclose whether a user email exists when catching Auth exceptions (`AppErrorMessages.Auth.INVALID_CREDENTIALS`).
2. **Local Caching Fallback:** When network fails or is slow, persist applications and user dossier into browser `localStorage` (Web) or `SharedPreferences` (Android).
3. **Storage Fallback URLs:** Construct deterministic public URLs when direct API responses time out.
4. **Debounced Realtime Writes:** Batch high-frequency chat keystrokes or slider updates before sending updates to PostgREST.

---

*Manual maintained for MedRussia Android & Web Cross-Platform Engineering.*
