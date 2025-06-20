import { createClient } from '@supabase/supabase-js';

// Runtime environment variables
// These must be defined in your `.env.local` (or production environment) file.
//
// SUPABASE_URL             e.g. https://xyzcompany.supabase.co
// SUPABASE_ANON_KEY        Public anon key (safe for client-side usage)
//
// For server-side scripts that need elevated permissions you can also add:
// SUPABASE_SERVICE_KEY     Service role key (KEEP THIS ON THE SERVER ONLY)
//
// In Astro, environment variables that do NOT start with `PUBLIC_` are
// automatically stripped from any client-side bundles, so this file is safe to
// import from both server & browser contexts.

const supabaseUrl = import.meta.env.SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase environment variables are missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------------------------------------------------------------------------
// Table row type helpers – keep these in sync with your Supabase schema.
// ---------------------------------------------------------------------------

export interface Keyword {
  id: number;
  keyword: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
  cpc: number | null;
  trend_growth: number | null;
  opportunity_score: number | null;
  cluster_id: string | null;
  status: 'research' | 'queued' | 'drafted' | 'published';
  created_at: string; // ISO string
}

export interface Page {
  id: number;
  slug: string;
  title: string;
  keyword_id: number;
  content_status: 'draft' | 'qa_pending' | 'approved' | 'published' | 'needs_revision';
  qa_score: number | null;
  meta_description: string | null;
  schema_json: Record<string, unknown> | null;
  wine_data: Record<string, unknown> | null;
  created_at: string;
  published_at: string | null;
} 