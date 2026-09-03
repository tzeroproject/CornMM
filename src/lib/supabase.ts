import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-supabase-anon-key'
);

let schemaAvailable: boolean | null = null;

export function isSchemaReady(): boolean {
  return isSupabaseConfigured && schemaAvailable !== false;
}

export function handleSupabaseError(error: any, context?: string): void {
  if (!error) return;
  const isSchemaMissing =
    error.code === 'PGRST205' ||
    (typeof error.message === 'string' && (
      error.message.includes('schema cache') ||
      error.message.includes('does not exist') ||
      error.message.includes('relation')
    ));

  if (isSchemaMissing) {
    if (schemaAvailable !== false) {
      schemaAvailable = false;
      console.error(
        `[StreamSphere] Supabase schema is unavailable (${error.code || error.message}). ` +
        `Cloud database is required; localStorage fallback is disabled.`
      );
    }
  } else {
    console.warn(`[Supabase ${context || 'query'} notice]:`, error.message || error);
  }
}

if (!isSupabaseConfigured) {
  console.error('[StreamSphere] Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
