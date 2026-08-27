-- MedRussia Local Supabase Seed Script for 1 Student & 1 Admin user
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  student_id UUID := '11111111-1111-1111-1111-111111111111';
  admin_id UUID   := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- 1. Create Test Student User in auth.users
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user
  ) VALUES (
    student_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'student@medrussia.in',
    crypt('student123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"], "role": "student"}'::jsonb,
    '{"name": "Test Student", "role": "student"}'::jsonb,
    NOW(),
    NOW(),
    false
  ) ON CONFLICT (id) DO UPDATE SET 
    encrypted_password = EXCLUDED.encrypted_password,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  -- 2. Create Test Student Profile in public.users
  INSERT INTO public.users (id, email, name, phone, neet_score, budget)
  VALUES (student_id, 'student@medrussia.in', 'Test Student', '+919876543210', 450, '₹25 Lakhs')
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    neet_score = EXCLUDED.neet_score;

  -- 3. Create Test Admin User in auth.users
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user
  ) VALUES (
    admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@medrussia.in',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"], "role": "admin"}'::jsonb,
    '{"name": "Test Admin", "role": "admin"}'::jsonb,
    NOW(),
    NOW(),
    false
  ) ON CONFLICT (id) DO UPDATE SET 
    encrypted_password = EXCLUDED.encrypted_password,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  -- 4. Create Test Admin Profile in public.users
  INSERT INTO public.users (id, email, name, phone)
  VALUES (admin_id, 'admin@medrussia.in', 'Test Admin', '+919876543211')
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone;

END $$;
