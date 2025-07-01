/**
 * Test daily automation workflow with Supabase saving
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { getDataForSEOClient } from '../lib/dataforseo-client.js';

// Load env vars
config({ path: '.env.local', override: true });

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_ANON_KEY not found in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDailyAutomation() {
  console.log('🧪 Testing daily automation with Supabase...\n');

  try {
    // Step 1: Get some keywords from our database
    console.log('1. Getting keywords from database...');
    const { data: keywords, error: keywordError } = await supabase
      .from('keyword_opportunities')
      .select('keyword, search_volume, keyword_difficulty')
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .limit(3);

    if (keywordError || !keywords || keywords.length === 0) {
      console.log('❌ No keywords found, using fallback data');
      // Fallback to DataForSEO
      const client = getDataForSEOClient();
      const fallbackData = await client.getKeywordData(['wine pairing', 'pinot noir']);
      keywords.push(...fallbackData.map(kw => ({
        keyword: kw.keyword,
        search_volume: kw.search_volume,
        keyword_difficulty: kw.keyword_difficulty
      })));
    }

    console.log(`✅ Found ${keywords.length} keywords to work with`);

    // Step 2: Test saving wine pages (simplified)
    console.log('\n2. Testing wine page creation...');
    
    for (const kw of keywords.slice(0, 2)) { // Test with 2 keywords
      const slug = kw.keyword.toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, '-') + '-test';

      const pageData = {
        slug: slug,
        title: `${kw.keyword} - Expert Wine Guide`,
        description: `Discover the perfect ${kw.keyword} with our expert recommendations.`,
        content: `Expert guide for ${kw.keyword} with professional recommendations.`,
        keywords: [kw.keyword, 'wine', 'guide'],
        status: 'published'
      };

      // Try to insert
      const { data: insertData, error: insertError } = await supabase
        .from('wine_pages')
        .upsert(pageData)
        .select();

      if (insertError) {
        console.log(`❌ Failed to save "${kw.keyword}":`, insertError.message);
      } else {
        console.log(`✅ Saved "${kw.keyword}" page successfully`);
      }
    }

    // Step 3: Check what was saved
    console.log('\n3. Checking saved data...');
    const { data: savedPages, error: checkError } = await supabase
      .from('wine_pages')
      .select('slug, title, status, created_at')
      .like('slug', '%-test')
      .order('created_at', { ascending: false });

    if (checkError) {
      console.log('❌ Error checking saved pages:', checkError.message);
    } else {
      console.log(`✅ Found ${savedPages?.length || 0} test pages in database`);
      savedPages?.forEach(page => {
        console.log(`  - ${page.slug}: ${page.title}`);
      });
    }

    // Step 4: Clean up test data
    console.log('\n4. Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('wine_pages')
      .delete()
      .like('slug', '%-test');

    if (deleteError) {
      console.log('❌ Cleanup failed:', deleteError.message);
    } else {
      console.log('✅ Test data cleaned up');
    }

    console.log('\n🎉 Daily automation test completed!');
    console.log('\nNext steps:');
    console.log('1. Add missing columns to wine_pages table in Supabase');
    console.log('2. Run "npm run wine:daily" to test full automation');
    console.log('3. Check "npm run check:database" to see all saved data');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDailyAutomation();