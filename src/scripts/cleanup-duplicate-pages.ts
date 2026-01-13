/**
 * Remove duplicate page entries from database
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local', override: true });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

const duplicateSlugs = [
  'price-natural-wine',
  'orange-wine-cheap',
  'review-orange-wine',
  'under-20-orange-wine',
  'under-50-orange-wine'
];

async function cleanupDuplicates() {
  console.log('=== Cleaning up duplicate page entries ===\n');

  for (const slug of duplicateSlugs) {
    const { error } = await supabase
      .from('wine_pages')
      .delete()
      .eq('slug', slug);

    if (error) {
      console.log(`❌ Error deleting ${slug}: ${error.message}`);
    } else {
      console.log(`✅ Deleted: ${slug}`);
    }
  }

  // Show remaining pages
  const { data: pages, count } = await supabase
    .from('wine_pages')
    .select('slug', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`\n📊 Total pages remaining: ${count}`);
  console.log('\nRecent pages:');
  pages?.forEach((p, i) => console.log(`  ${i + 1}. ${p.slug}`));
}

cleanupDuplicates();
