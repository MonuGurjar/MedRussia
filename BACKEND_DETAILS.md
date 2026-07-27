# MedRussia – Backend Architecture & Technical Specifications

This document contains full technical details of the backend services, API endpoints, database schemas, security configurations, environment variables, and scripts for the MedRussia platform.

---

## 1. System Architecture Overview

The backend is built using a **Vercel Serverless Node.js/TypeScript** architecture backed completely by **Supabase** for identity management, relational & document storage, and security:

- **Authentication & Identity**: Supabase Auth (User identity, session JWTs, roles in `app_metadata.role`).
- **Primary Database**: Supabase PostgreSQL (`public` schema containing `users`, `kv_store`, `audit_logs`, and `guest_ai_stats` tables).
- **File & Media Storage**: Cloudinary (Base64 JPEG/PNG/PDF uploads & SHA1 signed file deletion).
- **Email Service**: Resend API (`admissions@medrussia.in`).
- **AI Processing**: Groq API (`llama-3.3-70b-versatile`) with prompt-injection protections and guest rate limits.
- **Security & Headers**: Vercel HTTP Security headers (CSP, HSTS, X-Frame-Options, XSS protection) & Supabase Row Level Security (RLS).

---

## 2. API Endpoint Specifications

All serverless functions are defined in the `/api` directory and export default handlers wrapped with authorization middleware.

### 2.1 AI Proxy Endpoint (`POST /api/ai`)
- **File**: `api/ai.ts`
- **Authentication**: `withOptionalAuth` (Supports both authenticated users and guests)
- **Request Body**:
  ```json
  {
    "messages": [
      { "role": "user", "content": "Tell me about MBBS in Russia" }
    ],
    "model": "llama-3.3-70b-versatile",
    "jsonMode": false,
    "temperature": 0.7
  }
  ```
- **Business Logic & Security**:
  1. **Prompt Length Limit**: Rejects requests if total character count in `messages` exceeds **4,000 characters**.
  2. **Guest Rate Limiting**: Unauthenticated users (no valid JWT) are limited to **5 messages per day per IP address**. Guest usage is stored in Supabase table `guest_ai_stats` with ID format `ai_guest_${ip}_${date}`.
  3. **System Prompt Injection Protection**: Appends a mandatory security directive for non-admin users preventing prompt override or instruction bypass.
  4. Calls `https://api.groq.com/openai/v1/chat/completions` using `GROQ_API_KEY`. Replaces system prompts dynamically.

---

### 2.2 Database Store Proxy (`POST /api/db`)
- **File**: `api/db.ts`
- **Authentication**: `withAuth` (Requires valid Supabase JWT)
- **Whitelisted Keys**:
  - `med_russia:feedback`
  - `med_russia:users`
  - `med_russia:settings`
  - `med_russia:chat_logs`
  - `med_russia:platform_feedback`
  - `med_russia:team`
  - `med_russia:direct_chats`
- **Commands**:
  - **`GET`**: Fetches key value from Supabase table `public.kv_store`.
    - Note: Keys `med_russia:users` and `med_russia:chat_logs` require role `admin`, `super_admin`, `manager`, or `staff`. Special handler routes `med_russia:users` directly to Supabase `public.users` table.
  - **`SET`**: Updates or upserts key in `public.kv_store`.
    - Keys `med_russia:settings`, `med_russia:users`, `med_russia:team` require `admin` or `super_admin` role. `med_russia:users` updates are executed via Supabase `.upsert()` batch mutation.
  - **`DEL`**: Deletes key from `public.kv_store` (Requires `admin` or `super_admin` role).

---

### 2.3 Email Service Endpoint (`POST /api/email`)
- **File**: `api/email.ts`
- **Authentication**: `withAuth` (Requires `admin` role)
- **Request Body**:
  ```json
  {
    "to_email": "student@example.com",
    "student_name": "John Doe",
    "counsellor_name": "Admissions Team",
    "university_name": "Kazan Federal University",
    "neet_score": "520",
    "pcb_percentage": "85%",
    "reply_message": "Congratulations on your offer!",
    "subject": "MedRussia University Admission Update"
  }
  ```
- **Business Logic**:
  - Sanitizes user input with HTML character escaping to prevent XSS/HTML injection.
  - Sends styled HTML transactional emails via Resend SDK (`from: 'MedRussia <admissions@medrussia.in>'`).

---

### 2.4 Storage & Upload Endpoint (`POST` / `DELETE` `/api/upload`)
- **File**: `api/upload.ts`
- **Authentication**: `withAuth`
- **`POST` File Upload**:
  - Accepts Base64 encoded file string in `request.body.fileData`.
  - **Validations**:
    - Allowed MIME types: `image/jpeg`, `image/png`, `image/jpg`, `application/pdf`.
    - Maximum size: 4MB binary (~5.5MB Base64 string length).
  - Uploads to Cloudinary via unsigned upload preset (`CLOUDINARY_UPLOAD_PRESET`).
  - Records an audit log event in Supabase table `public.audit_logs` (`FILE_UPLOADED`).
- **`DELETE` File Removal**:
  - Requires `public_id` and optional `resource_type` (default: `image`).
  - Generates SHA1 signature using `public_id`, `timestamp`, and `CLOUDINARY_API_SECRET`.
  - Calls Cloudinary destroy API endpoint. Records audit log event in Supabase (`FILE_DELETED`).

---

### 2.5 User Management Endpoint (`GET` | `POST` | `PUT` | `DELETE` `/api/users`)
- **File**: `api/users.ts`
- **Authentication**: `withAuth`
- **Operations**:
  - **`GET`**: Fetches user profile by `id` or `email` from Supabase table `public.users`. Non-admins can only fetch their own user profile. Fetching all users requires staff/manager/admin role.
  - **`POST`**: Validates request body using Zod (`UserSchema`). Strips `role` field before saving into Supabase `public.users` table (roles are managed exclusively in Supabase `auth.users.app_metadata`).
  - **`PUT`**: Updates existing user row in Supabase `public.users`. Strips `_id` and `role` fields.
  - **`DELETE`**: Deletes user profile from Supabase `public.users` by `email` (Admin/Super Admin only).

---

### 2.6 Role Management Endpoint (`PUT /api/users/role`)
- **File**: `api/users/role.ts`
- **Authentication**: `withAuth` (Requires `super_admin` role)
- **Allowed Roles**: `student`, `staff`, `manager`, `admin`, `super_admin`
- **Request Body**:
  ```json
  {
    "targetUserId": "supabase-user-uuid",
    "newRole": "admin"
  }
  ```
- **Business Logic**:
  - Uses Supabase Service Role client (`SUPABASE_SERVICE_ROLE_KEY`) to call `supabaseAdmin.auth.admin.updateUserById`.
  - Sets `app_metadata: { role: newRole }`.

---

### 2.7 Audit Logs Endpoint (`POST` | `GET` `/api/audit`)
- **File**: `api/audit.ts`
- **Authentication**: `withAuth`
- **`POST`**: Logs audit entry `{ userId, action, details, ipAddress, timestamp }` into Supabase `public.audit_logs` table.
- **`GET`**: Admin-only paginated log reader (`/api/audit?search=...&action=...&from=...&to=...&page=1&limit=50`).

---

### 2.8 Config Endpoint (`GET /api/config`)
- **File**: `api/config.ts`
- **Authentication**: None (Public)
- **Response**: `{ "serverStatus": "online" }`

---

## 3. Supabase Database Schemas & Data Model

All persistent data is stored in the Supabase PostgreSQL **`public` schema**.

### 3.1 SQL DDL Schema Definitions

```sql
-- 1. Public Users Table (Linked to auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  neet_score INT,
  budget TEXT,
  shortlisted_universities JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '{}'::jsonb,
  notifications JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Key-Value Store Table (Global Settings, Chat Logs, Feedback)
CREATE TABLE public.kv_store (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Audit Logs Table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Guest AI Rate Limit Stats Table
CREATE TABLE public.guest_ai_stats (
  id TEXT PRIMARY KEY, -- Format: ai_guest_{ip}_{date}
  ip_address TEXT NOT NULL,
  date DATE NOT NULL,
  count INT DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.2 Supabase Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kv_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_ai_stats ENABLE ROW LEVEL SECURITY;

-- Users Table Policies
CREATE POLICY "Users can read own profile" ON public.users 
  FOR SELECT USING (auth.uid() = id OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin', 'staff', 'manager'));

CREATE POLICY "Users can update own profile" ON public.users 
  FOR UPDATE USING (auth.uid() = id OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

-- Audit Logs Policies (Admin Read, System Write)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs 
  FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));
```

---

### 3.3 Supabase Auth Metadata Structure
- `user.app_metadata.role`: Role string (`student`, `staff`, `manager`, `admin`, `super_admin`).
- `user.user_metadata.full_name`: Display name registered at sign-up.

---

## 4. Environment Variables

| Variable | Scope | Required | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Client & Server | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client & Server | Yes | Supabase publishable public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Yes | Supabase Service Role key (for table admin bypass & auth role mutations) |
| `GROQ_API_KEY` | Server | Yes | API key for Groq AI inference |
| `RESEND_API_KEY` | Server | Yes | API key for Resend email dispatch |
| `CLOUDINARY_CLOUD_NAME` | Server | Yes | Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY` | Server | Yes | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Server | Yes | Cloudinary API Secret (for signed deletes) |
| `CLOUDINARY_UPLOAD_PRESET` | Server | Yes | Unsigned upload preset name |

---

## 5. Security & Authentication Infrastructure

### 5.1 Auth Middleware (`src/lib/apiAuth.ts`)
- Decodes standard Bearer JWT from `Authorization: Bearer <token>` header.
- Verifies JWT against Supabase Auth user metadata (`/auth/v1/user` endpoint or JWT decode).
- Attaches `AuthUser` object (`id`, `email`, `role`) to handler arguments.

### 5.2 Zod Validation (`src/lib/validators.ts`)
- `UserSchema`: Validates user registration/profile updates.
- Ensures phone numbers, email strings, NEET scores, and budget formats meet application standards before Supabase persistence.

---

## 6. Maintenance & Seeding Scripts

### 6.1 Database Seeding Script (`seed.js`)
- **Execution**: `node seed.js`
- Requires `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Clears `public.users` and `public.kv_store` tables via Supabase Service Role client.
- Creates Super Admin in Supabase Auth (`admin@medrussia.com`) and inserts user record into `public.users` with `role: 'admin'`.
- Creates Test Student in Supabase Auth (`student@medrussia.com`) and inserts student profile into `public.users` with `role: 'student'`.

### 6.2 User Verification Script (`check_user.js`)
- **Execution**: `node check_user.js`
- Uses Supabase Admin SDK (`supabase.auth.admin.listUsers()`) to query user records and output `app_metadata` and `user_metadata` for validation during development.

### 6.3 Test Scripts (`test-signup.js`, `test-regex.js`)
- `test-signup.js`: Verifies `supabase.auth.signUp()` functionality against live Supabase project.
- `test-regex.js`: Verifies Vercel URL rewrite regular expressions for single-page app routing.
