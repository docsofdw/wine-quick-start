import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { normalizePagePath } from '../lib/search-console.js';

config({ path: '.env.local', override: true });

const args = process.argv.slice(2);
const fileArg = args.find(arg => arg.startsWith('--file='));
const dateArg = args.find(arg => arg.startsWith('--date='));
const dryRun = args.includes('--dry-run');

if (!fileArg) {
  console.error('Usage: npx tsx src/scripts/import-search-console.ts --file=/absolute/path/to/export.csv [--date=YYYY-MM-DD] [--dry-run]');
  process.exit(1);
}

const filePath = path.resolve(fileArg.split('=')[1]);
const fallbackDate = dateArg ? dateArg.split('=')[1] : new Date().toISOString().slice(0, 10);
const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface SearchConsoleCsvRow {
  topPages: string;
  clicks: string;
  impressions: string;
  ctr: string;
  position: string;
  date?: string;
}

interface SearchConsoleInsertRow {
  site_url: string;
  page_path: string;
  date: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
  source: string;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map(cell => cell.trim());
}

function parseCsv(content: string): SearchConsoleCsvRow[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map(header => header.toLowerCase().replace(/[^a-z0-9]+/g, ''));
  return lines.slice(1).map(line => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row as unknown as SearchConsoleCsvRow;
  });
}

function parsePercent(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace('%', '').trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) return null;
  return parsed > 1 ? parsed / 100 : parsed;
}

function parseNumber(value: string): number {
  const parsed = Number(String(value || '').replace(/,/g, '').trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parsePosition(value: string): number | null {
  const parsed = parseNumber(value);
  return parsed > 0 ? parsed : null;
}

function inferSiteUrl(page: string): string {
  const match = page.match(/^https?:\/\/[^/]+/i);
  return match ? match[0].toLowerCase() : (process.env.SITE_URL || 'https://winesquickstart.com');
}

async function main() {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    console.error('❌ No rows found in CSV');
    process.exit(1);
  }

  const normalized: SearchConsoleInsertRow[] = rows
    .map(row => {
      const page = row.topPages || (row as any).toppages || (row as any).page || (row as any).pages || '';
      if (!page) return null;

      return {
        site_url: inferSiteUrl(page),
        page_path: normalizePagePath(page),
        date: row.date || fallbackDate,
        clicks: parseNumber(row.clicks),
        impressions: parseNumber(row.impressions),
        ctr: parsePercent(row.ctr),
        position: parsePosition(row.position),
        source: 'csv_import',
      };
    })
    .filter((row): row is SearchConsoleInsertRow => row !== null);

  console.log(`Parsed ${normalized.length} page rows from ${path.basename(filePath)}`);

  if (dryRun) {
    for (const row of normalized.slice(0, 10)) {
      console.log(`${row.date} ${row.page_path} | clicks=${row.clicks} impressions=${row.impressions} ctr=${row.ctr ?? 'null'} position=${row.position ?? 'null'}`);
    }
    console.log('Dry run only; no rows inserted.');
    return;
  }

  const { error } = await supabase
    .from('search_console_page_metrics')
    .upsert(normalized, {
      onConflict: 'page_path,date',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('❌ Failed to upsert Search Console metrics:', error.message);
    process.exit(1);
  }

  console.log(`✅ Upserted ${normalized.length} Search Console page rows`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
