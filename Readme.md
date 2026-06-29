# MBBS Russia

<div align="center">

### The modern platform for MBBS admissions in Russia.

An end-to-end admission platform that helps students discover universities, estimate costs, communicate with counselors, upload documents, and manage the complete admission journey from a single dashboard.

<p>

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge\&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge\&logo=typescript\&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge\&logo=mongodb\&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge\&logo=supabase\&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge\&logo=tailwindcss\&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge\&logo=vercel)

</p>

[Website](https://medrussia.in) •
[Documentation](docs/) •
[Report Bug](../../issues) •
[Request Feature](../../issues)

</div>

---

## Overview

MBBS Russia is a modern admission management platform built for educational consultancies and students applying to Russian medical universities.

The platform digitizes the complete admission workflow—from the first inquiry to final enrollment—eliminating spreadsheets, WhatsApp conversations, PDFs, and manual tracking.

Students can explore universities, compare tuition fees, estimate their budget, check eligibility, upload admission documents, and communicate with counselors through a single unified platform.

---

## Why this project?

Traditional admission consultancies often rely on disconnected tools:

* Excel spreadsheets
* Google Forms
* WhatsApp groups
* Phone calls
* Manual document verification
* Offline record keeping

MBBS Russia replaces these fragmented workflows with one integrated platform.

---

# Features

## Public Website

* Modern landing page
* University explorer
* University comparison
* University profiles
* Consultation forms
* Team showcase
* Admission process
* Currency calculator
* Floating support widget
* Feedback system

---

## Student Dashboard

* Personalized dashboard
* Inquiry management
* Real-time counselor chat
* Budget calculator
* Eligibility checker
* University explorer
* Profile management
* Document uploads
* Checklist tracker
* Notifications
* Help Center

---

## Administration

* Student management
* University management
* Document verification
* Inquiry assignment
* Counselor dashboard
* Role management
* Analytics
* Feedback moderation

---

## AI Features

* AI eligibility analysis
* AI-powered counseling
* Smart university recommendations
* Automated admission assistance

---

# Screenshots

```
Landing Page
├── Hero
├── University Explorer
├── Compare Universities
├── Admission Process
└── Consultation

Student Dashboard
├── Dashboard
├── Chat
├── Budget Calculator
├── Eligibility
├── Documents
├── Profile
└── Settings

Administration
├── Students
├── Universities
├── Analytics
├── Documents
└── Roles
```

---

# Technology Stack

| Layer          | Technology   |
| -------------- | ------------ |
| Framework      | Next.js      |
| Language       | TypeScript   |
| UI             | React        |
| Styling        | Tailwind CSS |
| Authentication | Supabase     |
| Database       | MongoDB      |
| Storage        | Cloudinary   |
| AI             | Groq         |
| Deployment     | Vercel       |

---

# Architecture

```text
                        Browser
                           │
                           ▼
                 Next.js Application
                           │
         ┌─────────────────┴──────────────────┐
         │                                    │
         ▼                                    ▼
   Supabase Auth                     Next.js API Routes
                                              │
                       ┌──────────────────────┴─────────────────────┐
                       ▼                                            ▼
                  MongoDB                                    Cloudinary
                       │
                       ▼
                Business Logic
```

---

# Project Structure

```text
.
├── app/
├── components/
├── features/
├── hooks/
├── lib/
├── services/
├── models/
├── middleware.ts
├── public/
├── docs/
└── README.md
```

---

# Security

Authentication and authorization are built around production-grade practices.

* JWT authentication
* Role-based access control
* Protected API routes
* Server-side validation
* Secure sessions
* Signed Cloudinary uploads
* Input sanitization

---

# Environment Variables

```env
MONGODB_URI=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

GROQ_API_KEY=
```

---

# Roadmap

* AI admission assistant
* OCR document verification
* WhatsApp integration
* Push notifications
* Mobile applications
* Payment gateway
* Video consultation
* Multi-language support
* Student timeline
* Analytics dashboard

---

## 📄 License

Copyright © 2026 MedRussia.

This repository contains proprietary software.

The source code is provided for portfolio and demonstration purposes only.

You may not:

- Copy or redistribute the source code
- Modify or create derivative works
- Use the software commercially
- Deploy or host this application without written permission

All rights reserved.
---

# Acknowledgements

Built with modern web technologies including Next.js, TypeScript, MongoDB, Supabase, Tailwind CSS, Cloudinary, and Groq AI.

---

<div align="center">

**Built for modern educational consultancies.**

Making international medical admissions transparent, digital, and student-friendly.

</div>
