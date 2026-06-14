import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Warning: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in frontend environment configuration.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
