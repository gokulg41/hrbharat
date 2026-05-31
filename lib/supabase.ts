import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing environment configuration keys inside .env.local');
}

// Client-side initialization using the safe public anonymous key matrix
export const supabase = createClient(supabaseUrl, supabaseAnonKey);