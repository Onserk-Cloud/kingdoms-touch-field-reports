import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Whether Supabase credentials are configured. When false the app runs in
 * "demo mode" (mock data only) so the UI is still navigable.
 */
export const HAS_SUPABASE = Boolean(url && anonKey);

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!HAS_SUPABASE) {
    throw new Error(
      'Supabase no configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local.',
    );
  }
  if (!_client) {
    _client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: window.localStorage,
        storageKey: 'kt-auth',
      },
    });
  }
  return _client;
}

export const supabase: SupabaseClient | null = HAS_SUPABASE
  ? getSupabase()
  : null;
