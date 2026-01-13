/**
 * Check for duplicate/similar keywords in the database
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local', override: true });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

// Normalize keyword for comparison (sort words alphabetically)
function normalizeKeyword(keyword: string): string {
  return keyword.toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(' ')
    .sort()
    .join(' ');
}

async function checkDuplicates() {
  console.log('=== Checking for Duplicate Keywords ===\n');

  // Get all keywords
  const { data: keywords } = await supabase
    .from('keyword_opportunities')
    .select('keyword, search_volume, status, priority')
    .order('priority', { ascending: false });

  if (!keywords) {
    console.log('No keywords found');
    return;
  }

  // Group by normalized form
  const groups = new Map<string, typeof keywords>();

  for (const kw of keywords) {
    const normalized = normalizeKeyword(kw.keyword);
    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }
    groups.get(normalized)!.push(kw);
  }

  // Find duplicates (groups with more than 1 keyword)
  console.log('DUPLICATE GROUPS (same words, different order):');
  console.log('================================================\n');

  let duplicateCount = 0;
  for (const [normalized, group] of groups) {
    if (group.length > 1) {
      duplicateCount++;
      console.log(`Group: "${normalized}"`);
      for (const kw of group) {
        const status = kw.status || 'active';
        console.log(`  - "${kw.keyword}" (vol: ${kw.search_volume}, status: ${status})`);
      }
      console.log('');
    }
  }

  console.log(`\nTotal duplicate groups found: ${duplicateCount}`);

  // Show remaining unused unique keywords
  console.log('\n=== Unique Unused Keywords (ready to use) ===\n');

  let uniqueCount = 0;
  for (const [normalized, group] of groups) {
    if (group.length === 1) {
      const kw = group[0];
      const status = kw.status || 'active';
      if (status !== 'used') {
        uniqueCount++;
        if (uniqueCount <= 20) {
          console.log(`${uniqueCount}. "${kw.keyword}" (vol: ${kw.search_volume})`);
        }
      }
    }
  }

  console.log(`\nTotal unique unused keywords: ${uniqueCount}`);
}

checkDuplicates();
