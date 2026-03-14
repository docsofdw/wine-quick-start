import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SearchConsoleMetricRow {
  page_path: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
}

export interface SearchPerformanceSummary {
  impressions: number;
  clicks: number;
  ctr: number | null;
  position: number | null;
}

function buildSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export function normalizePagePath(input: string): string {
  if (!input) return '/';
  const withoutOrigin = input.replace(/^https?:\/\/[^/]+/i, '');
  const cleaned = withoutOrigin.startsWith('/') ? withoutOrigin : `/${withoutOrigin}`;
  return cleaned.replace(/\/+$/, '') || '/';
}

function isMissingMetricsTable(error: any): boolean {
  const message = String(error?.message || error || '');
  return /search_console_page_metrics|relation .* does not exist/i.test(message);
}

export async function loadLatestSearchPerformanceByUrl(): Promise<Map<string, SearchPerformanceSummary>> {
  const supabase = buildSupabaseClient();
  if (!supabase) return new Map();

  try {
    const { data, error } = await supabase
      .from('search_console_page_metrics')
      .select('page_path, clicks, impressions, ctr, position')
      .order('date', { ascending: false })
      .limit(5000);

    if (error) throw error;

    const byPath = new Map<string, SearchPerformanceSummary>();
    for (const row of (data || []) as SearchConsoleMetricRow[]) {
      const key = normalizePagePath(row.page_path);
      if (byPath.has(key)) continue;
      byPath.set(key, {
        clicks: Number(row.clicks || 0),
        impressions: Number(row.impressions || 0),
        ctr: row.ctr === null || row.ctr === undefined ? null : Number(row.ctr),
        position: row.position === null || row.position === undefined ? null : Number(row.position),
      });
    }

    return byPath;
  } catch (error: any) {
    if (isMissingMetricsTable(error)) return new Map();
    throw error;
  }
}
