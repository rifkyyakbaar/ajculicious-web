import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serverSupabaseSingleton: SupabaseClient | null = null;

export function createSupabaseServerClient(): SupabaseClient {
  if (serverSupabaseSingleton) {
    return serverSupabaseSingleton;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://vtjcnprlxrdzeslnqyqr.supabase.co';

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_3cIPcbwFQPK0ZdpDFYMbzw_958YZCp1';

  serverSupabaseSingleton = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return serverSupabaseSingleton;
}
