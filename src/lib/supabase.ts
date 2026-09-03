import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read public credentials
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' && 
  supabaseAnonKey !== 'your-supabase-anon-key'
);

// Track whether the remote database tables exist in the schema cache
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
      console.info(
        `[StreamSphere] Notice: Remote Supabase database is connected, but schema tables (e.g. public.videos) are not yet created (${error.code || error.message}). ` +
        `App is operating in local persistent store mode. To activate Cloud Database, run /supabase/migrations/20250101000000_initial_schema.sql in your Supabase SQL Editor.`
      );
    }
  } else {
    console.warn(`[Supabase ${context || 'query'} notice]:`, error.message || error);
  }
}

// Fallback dummy URL to satisfy client creation without throwing errors on initialization
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'placeholder-key';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : fallbackUrl,
  isSupabaseConfigured ? supabaseAnonKey : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
