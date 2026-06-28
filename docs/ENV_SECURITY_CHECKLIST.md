# Environment & Secrets Checklist

## Required server-side secrets (never expose to client)

- MONGODB_URI
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_JWT_SECRET
- KV_REST_API_URL
- KV_REST_API_TOKEN
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- CLOUDINARY_UPLOAD_PRESET
- RESEND_API_KEY
- GROQ_API_KEY

## Safe public vars (only when required)

- NEXT_PUBLIC_* (only non-sensitive values)
- VITE_* (only non-sensitive values)

## Deployment checklist

1. Add all required secrets to Vercel Project Settings.
2. Ensure no secret is committed to git.
3. Rotate leaked keys immediately.
4. Enforce branch protection before production deploy.
5. Verify security headers on every response.
