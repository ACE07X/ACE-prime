import { createClient } from '@supabase/supabase-js';

// Strict Railway-safe initialization
let supabase: ReturnType<typeof createClient> | null = null;

if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    console.log('✅ Supabase enabled');
} else {
    console.warn('⚠️ Supabase disabled (missing env vars)');
}

export { supabase };
