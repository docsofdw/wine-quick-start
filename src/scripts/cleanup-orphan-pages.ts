/**
 * Remove orphaned page entries (in DB but no file exists)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

config({ path: '.env.local', override: true });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

// Directories to check
const directories = ['wine-pairings', 'learn', 'buy'];

async function cleanupOrphans() {
  console.log('=== Cleaning up orphaned page entries ===\n');

  // Get all pages from database
  const { data: pages } = await supabase
    .from('wine_pages')
    .select('id, slug, title');

  if (!pages) {
    console.log('No pages found in database');
    return;
  }

  let orphanCount = 0;

  for (const page of pages) {
    // Check if file exists in any directory
    let fileExists = false;
    for (const dir of directories) {
      const filePath = path.join(process.cwd(), 'src/pages', dir, `${page.slug}.astro`);
      if (fs.existsSync(filePath)) {
        fileExists = true;
        break;
      }
    }

    if (!fileExists) {
      console.log(`❌ Orphan found: ${page.slug}`);
      console.log(`   Title: ${page.title}`);

      // Delete from database
      const { error } = await supabase
        .from('wine_pages')
        .delete()
        .eq('id', page.id);

      if (error) {
        console.log(`   Error deleting: ${error.message}`);
      } else {
        console.log(`   ✅ Deleted from database`);
        orphanCount++;
      }
      console.log('');
    }
  }

  console.log(`\n📊 Removed ${orphanCount} orphaned entries`);

  // Show final count
  const { count } = await supabase
    .from('wine_pages')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total pages remaining: ${count}`);
}

cleanupOrphans();
