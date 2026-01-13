/**
 * Test Wine Catalog Connection
 * Run with: npx tsx src/scripts/test-wine-catalog.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const wineCatalogUrl = process.env.WINE_CATALOG_URL;
const wineCatalogAnonKey = process.env.WINE_CATALOG_ANON_KEY;

async function testConnection() {
  console.log('🍷 Testing Wine Catalog Connection...\n');

  if (!wineCatalogUrl || !wineCatalogAnonKey) {
    console.error('❌ Missing WINE_CATALOG_URL or WINE_CATALOG_ANON_KEY environment variables');
    process.exit(1);
  }

  console.log(`📡 Connecting to: ${wineCatalogUrl}`);

  const client = createClient(wineCatalogUrl, wineCatalogAnonKey);

  // Test 1: Count total wines
  console.log('\n📊 Counting wines in catalog...');
  const { count, error: countError } = await client
    .from('wine_catalog')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting wines:', countError.message);
    process.exit(1);
  }

  console.log(`✅ Found ${count} wines in catalog`);

  // Test 2: Fetch sample wines
  console.log('\n🔍 Fetching sample wines...');
  const { data: sampleWines, error: sampleError } = await client
    .from('wine_catalog')
    .select('producer, wine_name, vintage, region, variety')
    .limit(5);

  if (sampleError) {
    console.error('❌ Error fetching sample:', sampleError.message);
    process.exit(1);
  }

  console.log('✅ Sample wines:');
  sampleWines?.forEach((wine, i) => {
    const vintage = wine.vintage || 'NV';
    console.log(`   ${i + 1}. ${vintage} ${wine.producer} ${wine.wine_name}`);
    console.log(`      Region: ${wine.region || 'N/A'} | Variety: ${wine.variety || 'N/A'}`);
  });

  // Test 3: Check variety distribution
  console.log('\n📈 Checking variety distribution...');
  const { data: varieties, error: varietyError } = await client
    .from('wine_catalog')
    .select('variety')
    .not('variety', 'is', null);

  if (!varietyError && varieties) {
    const varietyCounts: Record<string, number> = {};
    varieties.forEach(w => {
      const v = w.variety || 'Unknown';
      varietyCounts[v] = (varietyCounts[v] || 0) + 1;
    });

    const topVarieties = Object.entries(varietyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('✅ Top 10 varieties:');
    topVarieties.forEach(([variety, count], i) => {
      console.log(`   ${i + 1}. ${variety}: ${count} wines`);
    });
  }

  // Test 4: Check region distribution
  console.log('\n🗺️  Checking region distribution...');
  const { data: regions, error: regionError } = await client
    .from('wine_catalog')
    .select('region')
    .not('region', 'is', null);

  if (!regionError && regions) {
    const regionCounts: Record<string, number> = {};
    regions.forEach(w => {
      const r = w.region || 'Unknown';
      regionCounts[r] = (regionCounts[r] || 0) + 1;
    });

    const topRegions = Object.entries(regionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('✅ Top 10 regions:');
    topRegions.forEach(([region, count], i) => {
      console.log(`   ${i + 1}. ${region}: ${count} wines`);
    });
  }

  console.log('\n✅ Wine Catalog connection test complete!');
}

testConnection().catch(console.error);
