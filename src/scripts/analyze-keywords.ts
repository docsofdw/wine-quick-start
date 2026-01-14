/**
 * Keyword Opportunities Analysis Script
 * Analyzes the keyword_opportunities table to inform keyword strategy
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local', override: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey);

async function analyzeKeywords() {
  console.log('🔍 Analyzing Keyword Opportunities Database...\n');

  // 1. Total count
  const { count: totalCount, error: countError } = await client
    .from('keyword_opportunities')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error getting count:', countError);
  }

  console.log(`📊 Total keywords in database: ${totalCount || 0}\n`);

  // 2. Get all keywords
  const { data: keywords, error } = await client
    .from('keyword_opportunities')
    .select('*')
    .order('search_volume', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Error fetching keywords:', error);
    return;
  }

  if (!keywords || keywords.length === 0) {
    console.log('❌ No keywords found in keyword_opportunities table');
    console.log('\nThe table exists but is empty. You need to seed it first.');
    return;
  }

  // 3. Analyze by intent
  const intentCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const competitionCounts: Record<string, number> = {};

  for (const kw of keywords) {
    if (kw.intent) {
      intentCounts[kw.intent] = (intentCounts[kw.intent] || 0) + 1;
    }
    if (kw.status) {
      statusCounts[kw.status] = (statusCounts[kw.status] || 0) + 1;
    }
    if (kw.competition) {
      competitionCounts[kw.competition] = (competitionCounts[kw.competition] || 0) + 1;
    }
  }

  // Display results
  console.log('═══════════════════════════════════════');
  console.log('📈 TOP KEYWORDS BY SEARCH VOLUME');
  console.log('═══════════════════════════════════════');
  keywords.slice(0, 20).forEach((kw, i) => {
    console.log(`  ${i + 1}. "${kw.keyword}"`);
    console.log(`     Vol: ${kw.search_volume || 'N/A'} | KD: ${kw.keyword_difficulty || 'N/A'} | Priority: ${kw.priority || 'N/A'}`);
  });

  console.log('\n═══════════════════════════════════════');
  console.log('🎯 BY SEARCH INTENT');
  console.log('═══════════════════════════════════════');
  Object.entries(intentCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([intent, count]) => {
      console.log(`  ${intent}: ${count} keywords`);
    });

  console.log('\n═══════════════════════════════════════');
  console.log('📊 BY STATUS');
  console.log('═══════════════════════════════════════');
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`  ${status}: ${count} keywords`);
    });

  console.log('\n═══════════════════════════════════════');
  console.log('⚔️ BY COMPETITION LEVEL');
  console.log('═══════════════════════════════════════');
  Object.entries(competitionCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([competition, count]) => {
      console.log(`  ${competition}: ${count} keywords`);
    });

  // Volume stats
  const volumes = keywords.map(k => k.search_volume || 0).filter(v => v > 0);
  if (volumes.length > 0) {
    console.log('\n═══════════════════════════════════════');
    console.log('📉 SEARCH VOLUME STATS');
    console.log('═══════════════════════════════════════');
    console.log(`  Total keywords with volume: ${volumes.length}`);
    console.log(`  Highest volume: ${Math.max(...volumes)}`);
    console.log(`  Lowest volume: ${Math.min(...volumes)}`);
    console.log(`  Average volume: ${Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length)}`);
  }

  // Categorize keywords
  console.log('\n═══════════════════════════════════════');
  console.log('🏷️ KEYWORD CATEGORIES (detected)');
  console.log('═══════════════════════════════════════');

  const categories: Record<string, string[]> = {
    'Food Pairings': [],
    'Varietals/Grapes': [],
    'Regions': [],
    'Learning/Education': [],
    'Price/Budget': [],
    'Occasions': [],
    'Other': [],
  };

  const varietals = ['pinot', 'cabernet', 'merlot', 'chardonnay', 'sauvignon', 'riesling', 'syrah', 'malbec', 'zinfandel', 'tempranillo', 'prosecco', 'champagne'];
  const regions = ['napa', 'sonoma', 'burgundy', 'bordeaux', 'tuscany', 'rioja', 'oregon', 'barossa', 'champagne'];

  for (const kw of keywords) {
    const keyword = kw.keyword.toLowerCase();

    if (keyword.includes('with') || keyword.includes('pairing') || keyword.includes('food')) {
      categories['Food Pairings'].push(kw.keyword);
    } else if (varietals.some(v => keyword.includes(v))) {
      categories['Varietals/Grapes'].push(kw.keyword);
    } else if (regions.some(r => keyword.includes(r))) {
      categories['Regions'].push(kw.keyword);
    } else if (keyword.includes('how') || keyword.includes('what') || keyword.includes('guide') || keyword.includes('learn') || keyword.includes('explain')) {
      categories['Learning/Education'].push(kw.keyword);
    } else if (keyword.includes('$') || keyword.includes('under') || keyword.includes('cheap') || keyword.includes('budget') || keyword.includes('price')) {
      categories['Price/Budget'].push(kw.keyword);
    } else if (keyword.includes('dinner') || keyword.includes('party') || keyword.includes('wedding') || keyword.includes('date') || keyword.includes('christmas') || keyword.includes('thanksgiving')) {
      categories['Occasions'].push(kw.keyword);
    } else {
      categories['Other'].push(kw.keyword);
    }
  }

  for (const [category, kws] of Object.entries(categories)) {
    if (kws.length > 0) {
      console.log(`\n  ${category}: ${kws.length} keywords`);
      kws.slice(0, 5).forEach(k => console.log(`    - ${k}`));
      if (kws.length > 5) console.log(`    ... and ${kws.length - 5} more`);
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('📋 SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`Total keywords: ${keywords.length}`);
  console.log(`Active keywords: ${statusCounts['active'] || 0}`);
  console.log(`Used keywords: ${statusCounts['used'] || 0}`);
  console.log(`High priority (7+): ${keywords.filter(k => (k.priority || 0) >= 7).length}`);
  console.log(`Low competition: ${competitionCounts['low'] || 0}`);
}

analyzeKeywords()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
