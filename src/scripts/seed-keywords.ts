/**
 * Seed Wine Keywords to Database
 * Run this once to populate your keyword_opportunities table
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { wineKeywords } from '../lib/wine-keywords.js';

config({ path: '.env.local' });

async function seedKeywords() {
  console.log('🌱 Seeding wine keywords to Supabase...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log(`📊 Preparing ${wineKeywords.length} keywords...\n`);
  
  const keywordData = wineKeywords.map((keyword, index) => ({
    keyword,
    search_volume: Math.floor(Math.random() * 800) + 200, // 200-1000
    keyword_difficulty: Math.floor(Math.random() * 25) + 10, // 10-35 (easy to medium)
    cpc: (Math.random() * 1.5 + 0.5).toFixed(2), // $0.50-$2.00
    competition: 'low',
    intent: keyword.includes('buy') || keyword.includes('price') || keyword.includes('where') 
      ? 'commercial' 
      : keyword.includes('pairing') || keyword.includes('with')
      ? 'informational'
      : 'informational',
    priority: keyword.includes('pairing') || keyword.includes('with') ? 9 : 7,
    status: 'active',
    seasonality: keyword.includes('summer') || keyword.includes('bbq') ? 'seasonal' : 'stable',
    related_keywords: [],
    competitor_urls: [],
    content_gaps: []
  }));
  
  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < keywordData.length; i += batchSize) {
    const batch = keywordData.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('keyword_opportunities')
      .upsert(batch, { 
        onConflict: 'keyword',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
      console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1} (${batch.length} keywords)`);
    }
  }
  
  console.log(`\n📊 Final Results:`);
  console.log(`   ✅ Inserted: ${inserted}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`\n🎉 Keyword seeding complete!`);
  console.log(`💡 Run 'npm run wine:daily' to start generating content\n`);
}

seedKeywords().catch(error => {
  console.error('\n💥 Seed failed:', error);
  process.exit(1);
});

