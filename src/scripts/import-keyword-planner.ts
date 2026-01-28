/**
 * Import Google Keyword Planner Data
 *
 * Parses CSV exports from Google Keyword Planner and updates
 * our database with real CPC and search volume data.
 *
 * How to get data:
 * 1. Go to Google Ads → Tools → Keyword Planner
 * 2. Click "Get search volume and forecasts"
 * 3. Paste keywords or upload our exported list
 * 4. Click "Download" → CSV
 * 5. Run this script with the downloaded file
 *
 * Usage:
 *   npx tsx src/scripts/import-keyword-planner.ts <csv-file>
 *   npx tsx src/scripts/import-keyword-planner.ts data/keyword-planner-export.csv
 *
 * Options:
 *   --dry-run     Preview without updating database
 *   --update-all  Update all keywords (not just new ones)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config({ path: '.env.local', override: true });

// Parse CLI args
const args = process.argv.slice(2);
const csvFile = args.find(a => !a.startsWith('--'));
const isDryRun = args.includes('--dry-run');
const updateAll = args.includes('--update-all');

if (!csvFile) {
  console.log(`
📊 Google Keyword Planner Import Tool

Usage:
  npx tsx src/scripts/import-keyword-planner.ts <csv-file> [options]

Options:
  --dry-run     Preview without updating database
  --update-all  Update existing keywords (default: only new)

How to get the CSV:
  1. Go to Google Ads → Tools → Keyword Planner
  2. Click "Get search volume and forecasts"
  3. Paste keywords or upload ppc-exports/google-ads-keywords.csv
  4. Download as CSV
  5. Run this script with the downloaded file

Example:
  npx tsx src/scripts/import-keyword-planner.ts ~/Downloads/keyword-planner.csv
`);
  process.exit(0);
}

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface KeywordPlannerRow {
  keyword: string;
  avgMonthlySearches: number;
  competition: 'Low' | 'Medium' | 'High';
  competitionIndex: number;
  topOfPageBidLow: number;
  topOfPageBidHigh: number;
  cpc: number;
}

/**
 * Parse Google Keyword Planner CSV
 * Handles multiple CSV formats (new and old Google Ads exports)
 */
function parseKeywordPlannerCSV(filePath: string): KeywordPlannerRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Find header row (skip metadata rows)
  let headerIndex = lines.findIndex(line =>
    line.toLowerCase().includes('keyword') &&
    (line.toLowerCase().includes('search') || line.toLowerCase().includes('volume'))
  );

  if (headerIndex === -1) {
    // Try to find any row that looks like a header
    headerIndex = lines.findIndex(line =>
      line.includes(',') && !line.match(/^\d/)
    );
  }

  if (headerIndex === -1) {
    throw new Error('Could not find header row in CSV');
  }

  const headers = parseCSVLine(lines[headerIndex]).map(h => h.toLowerCase().trim());
  console.log('📋 Detected columns:', headers.join(', '));

  // Map column names (Google changes these sometimes)
  const columnMap: Record<string, string[]> = {
    keyword: ['keyword', 'keywords', 'search term', 'search terms'],
    volume: ['avg. monthly searches', 'average monthly searches', 'search volume', 'avg monthly searches', 'monthly searches'],
    competition: ['competition', 'comp.', 'competition (indexed value)'],
    competitionIndex: ['competition (indexed value)', 'competition index', 'comp. (indexed)'],
    bidLow: ['top of page bid (low range)', 'low top of page bid', 'top page bid (low)'],
    bidHigh: ['top of page bid (high range)', 'high top of page bid', 'top page bid (high)'],
  };

  const getColumnIndex = (names: string[]): number => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const keywordIdx = getColumnIndex(columnMap.keyword);
  const volumeIdx = getColumnIndex(columnMap.volume);
  const compIdx = getColumnIndex(columnMap.competition);
  const compIndexIdx = getColumnIndex(columnMap.competitionIndex);
  const bidLowIdx = getColumnIndex(columnMap.bidLow);
  const bidHighIdx = getColumnIndex(columnMap.bidHigh);

  if (keywordIdx === -1) {
    throw new Error('Could not find keyword column');
  }

  console.log(`\n📊 Column mapping:`);
  console.log(`   Keyword: column ${keywordIdx}`);
  console.log(`   Volume: column ${volumeIdx}`);
  console.log(`   Competition: column ${compIdx}`);
  console.log(`   Bid Low: column ${bidLowIdx}`);
  console.log(`   Bid High: column ${bidHighIdx}`);

  const results: KeywordPlannerRow[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    const keyword = values[keywordIdx]?.trim();
    if (!keyword || keyword.length < 3) continue;

    // Parse volume (handle "1K - 10K" format)
    let volume = 0;
    if (volumeIdx !== -1 && values[volumeIdx]) {
      volume = parseVolumeString(values[volumeIdx]);
    }

    // Parse competition
    let competition: 'Low' | 'Medium' | 'High' = 'Medium';
    let competitionIndex = 50;
    if (compIdx !== -1 && values[compIdx]) {
      const compStr = values[compIdx].toLowerCase().trim();
      if (compStr === 'low' || compStr === 'l') competition = 'Low';
      else if (compStr === 'high' || compStr === 'h') competition = 'High';
    }
    if (compIndexIdx !== -1 && values[compIndexIdx]) {
      competitionIndex = parseInt(values[compIndexIdx]) || 50;
    }

    // Parse bids
    let bidLow = 0, bidHigh = 0;
    if (bidLowIdx !== -1 && values[bidLowIdx]) {
      bidLow = parseCurrencyString(values[bidLowIdx]);
    }
    if (bidHighIdx !== -1 && values[bidHighIdx]) {
      bidHigh = parseCurrencyString(values[bidHighIdx]);
    }

    const cpc = bidHigh > 0 ? (bidLow + bidHigh) / 2 : bidLow;

    results.push({
      keyword,
      avgMonthlySearches: volume,
      competition,
      competitionIndex,
      topOfPageBidLow: bidLow,
      topOfPageBidHigh: bidHigh,
      cpc,
    });
  }

  return results;
}

/**
 * Parse a CSV line (handles quoted values with commas)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

/**
 * Parse volume strings like "1K - 10K", "10K - 100K", "100"
 */
function parseVolumeString(str: string): number {
  if (!str) return 0;

  str = str.replace(/,/g, '').trim();

  // Handle range format "1K - 10K"
  if (str.includes('-')) {
    const parts = str.split('-').map(s => s.trim());
    const low = parseVolumeValue(parts[0]);
    const high = parseVolumeValue(parts[1]);
    return Math.round((low + high) / 2);
  }

  return parseVolumeValue(str);
}

function parseVolumeValue(str: string): number {
  str = str.toUpperCase().replace(/,/g, '');

  if (str.includes('K')) {
    return parseFloat(str.replace('K', '')) * 1000;
  }
  if (str.includes('M')) {
    return parseFloat(str.replace('M', '')) * 1000000;
  }

  return parseInt(str) || 0;
}

/**
 * Parse currency strings like "$1.50", "1.50"
 */
function parseCurrencyString(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[$,]/g, '').trim();
  return parseFloat(cleaned) || 0;
}

/**
 * Convert competition to difficulty score (0-100)
 */
function competitionToDifficulty(competition: string, index: number): number {
  if (index > 0) return index;

  switch (competition.toLowerCase()) {
    case 'low': return 25;
    case 'medium': return 50;
    case 'high': return 75;
    default: return 50;
  }
}

async function importKeywordPlannerData() {
  console.log('📊 Google Keyword Planner Import\n');
  console.log('═══════════════════════════════════════════════\n');

  // Check file exists
  const filePath = path.resolve(csvFile);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`📂 Reading: ${filePath}\n`);

  // Parse CSV
  let keywords: KeywordPlannerRow[];
  try {
    keywords = parseKeywordPlannerCSV(filePath);
  } catch (err: any) {
    console.error(`❌ Failed to parse CSV: ${err.message}`);
    process.exit(1);
  }

  console.log(`\n✅ Parsed ${keywords.length} keywords\n`);

  // Show sample
  console.log('📋 Sample data:');
  keywords.slice(0, 5).forEach(kw => {
    console.log(`   "${kw.keyword}"`);
    console.log(`      Volume: ${kw.avgMonthlySearches}/mo | CPC: $${kw.cpc.toFixed(2)} | Comp: ${kw.competition}`);
  });

  if (isDryRun) {
    console.log('\n🔍 DRY RUN - Not updating database\n');

    // Show summary stats
    const totalVolume = keywords.reduce((sum, k) => sum + k.avgMonthlySearches, 0);
    const avgCPC = keywords.reduce((sum, k) => sum + k.cpc, 0) / keywords.length;
    const highComp = keywords.filter(k => k.competition === 'High').length;
    const medComp = keywords.filter(k => k.competition === 'Medium').length;
    const lowComp = keywords.filter(k => k.competition === 'Low').length;

    console.log('📊 Summary:');
    console.log(`   Total keywords: ${keywords.length}`);
    console.log(`   Total monthly volume: ${totalVolume.toLocaleString()}`);
    console.log(`   Average CPC: $${avgCPC.toFixed(2)}`);
    console.log(`   Competition: ${highComp} high / ${medComp} medium / ${lowComp} low`);

    console.log('\n💡 Run without --dry-run to update database');
    return;
  }

  // Update database
  console.log('\n💾 Updating database...\n');

  let updated = 0;
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const kw of keywords) {
    try {
      // Check if keyword exists
      const { data: existing } = await supabase
        .from('keyword_opportunities')
        .select('keyword, search_volume, cpc')
        .eq('keyword', kw.keyword)
        .single();

      if (existing && !updateAll) {
        // Only update if we have better data
        if (kw.avgMonthlySearches > 0 || kw.cpc > 0) {
          const { error } = await supabase
            .from('keyword_opportunities')
            .update({
              search_volume: kw.avgMonthlySearches || existing.search_volume,
              keyword_difficulty: competitionToDifficulty(kw.competition, kw.competitionIndex),
              cpc: kw.cpc || existing.cpc,
              competition: kw.competition.toLowerCase(),
            })
            .eq('keyword', kw.keyword);

          if (error) {
            failed++;
          } else {
            updated++;
          }
        } else {
          skipped++;
        }
      } else if (existing && updateAll) {
        const { error } = await supabase
          .from('keyword_opportunities')
          .update({
            search_volume: kw.avgMonthlySearches,
            keyword_difficulty: competitionToDifficulty(kw.competition, kw.competitionIndex),
            cpc: kw.cpc,
            competition: kw.competition.toLowerCase(),
          })
          .eq('keyword', kw.keyword);

        if (error) failed++;
        else updated++;
      } else {
        // Insert new keyword
        const { error } = await supabase
          .from('keyword_opportunities')
          .insert({
            keyword: kw.keyword,
            search_volume: kw.avgMonthlySearches,
            keyword_difficulty: competitionToDifficulty(kw.competition, kw.competitionIndex),
            cpc: kw.cpc,
            competition: kw.competition.toLowerCase(),
            intent: 'commercial', // Default for Keyword Planner imports
            priority: calculatePriority(kw),
            status: 'active',
            created_at: new Date().toISOString(),
          });

        if (error) {
          // Might be duplicate
          skipped++;
        } else {
          inserted++;
        }
      }
    } catch (err) {
      failed++;
    }
  }

  console.log('═══════════════════════════════════════════════');
  console.log('📋 IMPORT SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ Updated: ${updated}`);
  console.log(`➕ Inserted: ${inserted}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${keywords.length}\n`);
}

/**
 * Calculate priority score from Keyword Planner data
 */
function calculatePriority(kw: KeywordPlannerRow): number {
  let priority = 5;

  // Volume bonus
  if (kw.avgMonthlySearches > 5000) priority += 2;
  else if (kw.avgMonthlySearches > 1000) priority += 1.5;
  else if (kw.avgMonthlySearches > 500) priority += 1;
  else if (kw.avgMonthlySearches < 100) priority -= 1;

  // Competition bonus (lower = easier)
  if (kw.competition === 'Low') priority += 2;
  else if (kw.competition === 'High') priority -= 1;

  // CPC indicates value
  if (kw.cpc > 3) priority += 1; // High CPC = valuable
  if (kw.cpc > 5) priority += 0.5;

  return Math.min(10, Math.max(1, Math.round(priority)));
}

// Run
importKeywordPlannerData()
  .then(() => {
    console.log('✅ Import complete!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
