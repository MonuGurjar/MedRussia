# MedRussia – Production Architecture & Security Plan


# Service Responsibilities

## 1. Supabase (Authentication Only)

Use Supabase only for identity and authentication.

### Responsibilities

* Student Login
* Counselor Login
* Admin Login
* Email Verification
* Password Reset
* OAuth (Google,Facebook)
* Session Management
* JWT Tokens
* Multi-Factor Authentication (Admins)

### Store

```
users

id
email
role
created_at
last_login
```

Do NOT store student documents or CRM data here.

---

## 2. MongoDB Atlas (Main Database)

MongoDB stores all application data.

Collections

```
students
applications
universities
countries
counselors
payments
notifications
chat_rooms
messages
appointments
tasks
document_metadata
activity_logs
ai_conversations
support_tickets
```

Student Example

```json
{
  "_id":"",
  "authId":"",
  "name":"",
  "phone":"",
  "email":"",
  "passportNumber":"",
  "neetScore":"",
  "assignedCounselor":"",
  "status":"Document Verification",
  "documents":[]
}
```

---

## 3. Cloudinary (Storage)

Store every uploaded document.

Examples

* Passport
* Aadhaar
* PAN
* NEET Scorecard
* 10th Marksheet
* 12th Marksheet
* Passport Size Photo
* Visa
* Offer Letter
* Admission Letter
* Medical Reports
* PDFs
* Images

MongoDB stores only

```
document URL
public_id
folder
type
uploadedAt
```

Never store files inside MongoDB.

---

## 4. Upstash Redis

Temporary and high-speed data.

Use for

* OTP
* Session Cache
* Login Attempts
* Rate Limiting
* Chat Cache
* Typing Status
* Online Users
* Notification Queue
* AI Response Cache
* Password Reset Tokens

Example

```
otp:user123

expires 5 minutes
```

---

# Chat System

MongoDB

```
chat_rooms
messages
```

Message

```json
{
 "senderId":"",
 "receiverId":"",
 "message":"",
 "seen":false,
 "createdAt":""
}
```

Redis

```
online users
typing
unread count
```

---

# AI Chat

MongoDB

```
ai_conversations
```

Store

* Prompt
* Response
* Model
* Tokens
* Timestamp
* Feedback

---

# Audit Logs

Create a MongoDB collection named **`audit_logs`** to store important user and admin activities.

## Log these actions

* User Login
* User Logout
* User Registration
* Password Changed
* Password Reset
* Upload Document
* Delete Document
* Verify Document
* Reject Document
* Create Application
* Update Application
* Delete Application
* Assign Counselor
* Change Student Status
* Book Appointment
* Cancel Appointment
* Upload Payment Proof
* Verify Payment
* Reject Payment
* Admin Login
* Role Changed
* AI Chat Request
* Download Document

## Store these fields

```ts
{
  userId: string,
  userRole: string,
  action: string,
  entityType: string,
  entityId: string,
  description: string,
  ip: string,
  userAgent: string,
  status: "success" | "failed",
  createdAt: Date
}
```

## Example

```json
{
  "userId": "student123",
  "userRole": "student",
  "action": "UPLOAD_DOCUMENT",
  "entityType": "passport",
  "entityId": "passport001",
  "description": "Student uploaded passport",
  "ip": "103.xx.xx.xx",
  "userAgent": "Chrome on Windows",
  "status": "success",
  "createdAt": "2026-06-28T10:30:00Z"
}
```

## Notes

* Store audit logs permanently in **MongoDB**.
* Do **not** store audit logs in Redis.
* Create an admin page to search and filter logs by:

  * User
  * Action
  * Date
  * Status
* Record only important business and security events, not every API request.

---

# Notifications

MongoDB

Permanent Notifications

Redis

Unread Count

Real-time Delivery

---

# Search

MongoDB Atlas Search

Search

* Students
* Universities
* Passport Number
* Applications
* Counselors

---

# Emails

Use Resend

Examples

* OTP
* Welcome Email
* Offer Letter
* Password Reset
* Admission Updates

---

# AI

Use

* Groq

For

* Student Assistant
* FAQ
* University Search
* Admission Guidance

---

# Security

## Authentication

* Email Verification
* Password Hashing
* Session Expiration
* Refresh Tokens
* MFA for Admins
* Device Session Management

---

## Authorization

Roles

```
Super Admin
Admin
Manager
Counselor
Student
```

Every API checks

* Logged In
* Session Valid
* Correct Role

Never trust frontend permissions.

---

## Middleware

Protect

```
/dashboard
/admin
/student
/counselor
/api/*
```

Verify

* Authentication
* Authorization
* Session

---

## Input Validation

Validate request.

Use

* Zod
* Valibot

Never trust client input.

---

## File Upload Security

Validate

* MIME Type
* Extension
* File Size

Reject

```
.exe
.js
.php
.bat
.sh
```

Virus Scan

Rename files randomly

Strip metadata when possible

---

## Cloudinary Security

* Signed Uploads
* Private Upload Presets
* Private Folders
* Signed URLs for Downloads

---

## Rate Limiting

Using Upstash

Examples

Login

```
5 attempts / 15 min
```

OTP

```
3 requests / hour
```

AI

```
30 requests / hour
```

Upload

```
20 uploads / day
```

---

## Bot Protection

Protect

* Login
* Signup

---

## CSRF

Use

* SameSite Cookies
* CSRF Tokens where needed

---

## XSS Protection

Never use

```
dangerouslySetInnerHTML
```

Sanitize HTML if rich text is required.

---

## Injection Protection

Never create database queries directly from user input.

Validate all inputs.

---

## HTTPS

Force HTTPS

Enable HSTS

---

## Environment Variables

Never expose

```
MONGODB_URI
SUPABASE_SERVICE_ROLE_KEY
UPSTASH_TOKEN
CLOUDINARY_API_SECRET
OPENAI_API_KEY
```

Only expose

```
NEXT_PUBLIC_*
```

variables when safe.

---

## Audit Logs

Log

* User ID
* Action
* IP
* Browser
* Timestamp


---

## AI Security

Limit

* Prompt Size
* Upload Size
* Requests
* without login only 5-6 chat/req and capture ip for later or refresh page so it can get that user already used thier free req
Filter malicious prompts where appropriate.

---

## DDoS Protection

Use

* Vercel
* Upstash Rate Limiting

---

## Security Headers

Enable

```
Content-Security-Policy
Strict-Transport-Security
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
X-Frame-Options
Cross-Origin-Opener-Policy
Cross-Origin-Resource-Policy
```
---


# Recommended Production Stack


Hosting

* Vercel

Authentication

* Supabase

Database

* MongoDB Atlas

Storage

* Cloudinary

Cache

* Upstash Redis

Email

* Resend

AI

* Groq

Security

* Cloudflare
* Turnstile
* Upstash Rate Limiting
* CSP
* HTTPS
* Audit Logs
* Encryption
* RBAC

---

# full Final Architecture

```
                Internet
                    │
               DDoS protect
                    │
                 Vercel
                    │
         Next.js Middleware (RBAC/Auth)
                    │
      ┌─────────────┼─────────────┐
      │             │             │
  Supabase      MongoDB       Upstash
    Auth        Main DB        Redis
      │             │             │
      └─────────────┼─────────────┘
                    │
          Documents & Images
                    │
              Resend / AI 
```


current

Users
   │
Vercel
   │
Next.js
   │
Supabase (Auth)
   │
├── MongoDB Atlas
├── Cloudinary
├── Upstash Redis
├── Resend
└── Groq
