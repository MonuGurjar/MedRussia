# MedRussia Production Architecture & Security

This document defines the production architecture baseline for MedRussia.

## Core Services

- **Supabase (Auth only)**: identity, sessions, JWT, MFA for admin roles.
- **MongoDB Atlas**: primary business data store.
- **Cloudinary**: secure document/image storage.
- **Upstash Redis**: OTP, session cache, rate limiting, queue/cache workloads.
- **Resend**: transactional email.
- **Groq**: AI assistant & FAQ use-cases.

## Data Boundaries

### Supabase (auth boundary)
Only identity metadata:
- id
- email
- role
- created_at
- last_login

Never store business CRM/student documents in Supabase.

### MongoDB (application boundary)
Main collections include:
- students
- applications
- universities
- countries
- counselors
- payments
- notifications
- chat_rooms
- messages
- appointments
- tasks
- document_metadata
- activity_logs
- ai_conversations
- support_tickets
- audit_logs

### Cloudinary (storage boundary)
Store uploaded files in Cloudinary. MongoDB stores only metadata:
- url
- public_id
- folder
- type
- uploadedAt

Never store binary file payloads in MongoDB.

## Security Baseline

### Authentication
- Email verification
- Session expiration
- Refresh token support
- MFA for admins
- Device session management

### Authorization
Roles:
- Super Admin
- Admin
- Manager
- Counselor
- Student

All protected APIs must validate:
1. Authenticated user
2. Valid session/token
3. Role authorization

### Request Validation
Use schema validation at API boundaries.
Recommended: Zod.

### Upload Security
- Validate MIME type
- Validate extension
- Validate file size
- Block executable/script extensions:
  - .exe, .js, .php, .bat, .sh
- Use Cloudinary signed uploads for private assets
- Use signed URLs for downloads

### Rate Limits (Redis)
- Login: 5 attempts / 15 min
- OTP: 3 requests / hour
- AI: 30 requests / hour
- Upload: 20 uploads / day

### Web Security
- Enforce HTTPS
- Enable HSTS
- Set CSP and related headers
- Use SameSite cookies and CSRF protections where needed
- Sanitize rich text and avoid unsafe HTML rendering

## Audit Logging
Persist important business/security events in MongoDB (`audit_logs`) with:
- userId
- userRole
- action
- entityType
- entityId
- description
- ip
- userAgent
- status (success|failed)
- createdAt

Do not store audit logs in Redis.
