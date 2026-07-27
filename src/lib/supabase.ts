/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://bvkkcsbksrvbyxmfargy.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2a2tjc2Jrc3J2Ynl4bWZhcmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzQ0NzksImV4cCI6MjA5ODE1MDQ3OX0.placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
