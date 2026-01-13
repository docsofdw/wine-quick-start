/**
 * Mark duplicate keywords in the database
 * Keeps the keyword with highest search volume, marks others as 'duplicate'
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
    .filter(w => w.length > 0)
    .sort()
    .join(' ');
}

async function markDuplicates() {
  console.log('=== Marking Duplicate Keywords ===\n');

  // Get all keywords
  const { data: keywords } = await supabase
    .from('keyword_opportunities')
    .select('id, keyword, search_volume, status, priority')
    .order('search_volume', { ascending: false });

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

  // Find duplicates and mark them
  let markedCount = 0;

  for (const [normalized, group] of groups) {
    if (group.length > 1) {
      // Sort by search volume (highest first), then by status (used first)
      group.sort((a, b) => {
        // Prefer 'used' status
        if (a.status === 'used' && b.status !== 'used') return -1;
        if (b.status === 'used' && a.status !== 'used') return 1;
        // Then by search volume
        return (b.search_volume || 0) - (a.search_volume || 0);
      });

      // Keep the first one (highest volume or already used), mark rest as duplicate
      const keep = group[0];
      const duplicates = group.slice(1);

      console.log(`Group: "${normalized}"`);
      console.log(`  ✓ Keep: "${keep.keyword}" (vol: ${keep.search_volume}, status: ${keep.status || 'active'})`);

      for (const dup of duplicates) {
        // Only mark as duplicate if not already used
        if (dup.status !== 'used') {
          const { error } = await supabase
            .from('keyword_opportunities')
            .update({ status: 'duplicate' })
            .eq('id', dup.id);

          if (error) {
            console.log(`  ✗ Error marking "${dup.keyword}": ${error.message}`);
          } else {
            console.log(`  → Marked duplicate: "${dup.keyword}" (vol: ${dup.search_volume})`);
            markedCount++;
          }
        } else {
          console.log(`  • Already used: "${dup.keyword}" (keeping as used)`);
        }
      }
      console.log('');
    }
  }

  console.log(`\n✅ Marked ${markedCount} keywords as duplicates`);

  // Show remaining active keywords
  const { data: activeKeywords, count } = await supabase
    .from('keyword_opportunities')
    .select('keyword, search_volume', { count: 'exact' })
    .or('status.is.null,status.eq.active')
    .order('search_volume', { ascending: false })
    .limit(10);

  console.log(`\n=== Top 10 Active Unique Keywords ===`);
  activeKeywords?.forEach((kw, i) => {
    console.log(`${i + 1}. "${kw.keyword}" (vol: ${kw.search_volume})`);
  });
  console.log(`\nTotal active unique keywords: ${count}`);
}

markDuplicates();
