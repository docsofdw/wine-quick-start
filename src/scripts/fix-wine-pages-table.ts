/**
 * Fix wine_pages table schema to match our automation scripts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load env vars
config({ path: '.env.local', override: true });

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_ANON_KEY not found in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixWinePagesTable() {
  console.log('🔧 Fixing wine_pages table schema...\n');

  try {
    // Test current table structure
    console.log('1. Testing current wine_pages table...');
    const { data: testData, error: testError } = await supabase
      .from('wine_pages')
      .select('*')
      .limit(1);

    if (testError) {
      console.log('❌ Current table error:', testError.message);
    } else {
      console.log('✅ wine_pages table exists');
    }

    console.log('\n2. SQL to run in Supabase SQL Editor:');
    console.log('Go to: https://app.supabase.com/project/nsyubkcfsrsowgefkbii/sql');
    console.log('\nRun this SQL to add missing columns:');
    
    console.log(`
-- Add missing columns to wine_pages table
ALTER TABLE wine_pages 
ADD COLUMN IF NOT EXISTS search_volume INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS keyword_difficulty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;

-- Update existing records to have default values
UPDATE wine_pages 
SET 
  search_volume = COALESCE(search_volume, 0),
  keyword_difficulty = COALESCE(keyword_difficulty, 0),
  quality_score = COALESCE(quality_score, 0)
WHERE search_volume IS NULL 
   OR keyword_difficulty IS NULL 
   OR quality_score IS NULL;
    `);

    // Test if we can add the missing columns by attempting a simple insert
    console.log('\n3. Testing insert functionality...');
    
    const testSlug = `test-${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from('wine_pages')
      .insert({
        slug: testSlug,
        title: 'Test Wine Page',
        description: 'Test description',
        content: 'Test content',
        keywords: ['test'],
        status: 'draft'
      })
      .select();

    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message);
      console.log('\nThis confirms the table needs the missing columns added.');
    } else {
      console.log('✅ Basic insert successful');
      
      // Clean up test record
      await supabase
        .from('wine_pages')
        .delete()
        .eq('slug', testSlug);
    }

    console.log('\n🔗 After running the SQL:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Click "SQL Editor" in the sidebar');
    console.log('3. Paste and run the SQL above');
    console.log('4. Run "npm run check:database" to verify the fix');

  } catch (error) {
    console.error('❌ Error fixing table:', error);
  }
}

fixWinePagesTable();