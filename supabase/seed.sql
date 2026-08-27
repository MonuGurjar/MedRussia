-- MedRussia Supabase Seed Data

-- 1. Initial KV Store Settings
INSERT INTO public.kv_store (key, value)
VALUES (
  'med_russia:settings',
  '{"currencyConverter": {"enabled": true}, "chatBot": {"enabled": true, "botName": "Dr. MedRussia", "welcomeMessage": "Hello! I can help you with questions about MBBS fees, universities, and admission. Ask me anything!"}, "features": {"eligibilityCheck": true, "universityCompare": true, "chatWidget": true, "whatsappFab": true, "studentLogin": true}}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
