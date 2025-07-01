/**
 * Test DataForSEO API connection and functionality
 */

import { DataForSEOClient } from '../lib/dataforseo-client.js';

async function testDataForSEO() {
  console.log('🔍 Testing DataForSEO API connection...');
  
  try {
    const client = new DataForSEOClient();
    
    // Test 1: Account info
    console.log('\n1. Testing account info...');
    const accountInfo = await client.getAccountInfo();
    if (accountInfo) {
      console.log('✅ Account connected successfully');
      console.log(`Credits remaining: ${accountInfo.money}`);
    }
    
    // Test 2: Keyword data
    console.log('\n2. Testing keyword research...');
    const testKeywords = ['wine pairing', 'pinot noir', 'bordeaux wine'];
    const keywordData = await client.getKeywordData(testKeywords);
    
    if (keywordData.length > 0) {
      console.log('✅ Keyword data retrieved successfully');
      console.log('\nSample results:');
      keywordData.forEach(kw => {
        console.log(`- ${kw.keyword}: Volume=${kw.search_volume}, KD=${kw.keyword_difficulty}`);
      });
    }
    
    // Test 3: SERP analysis
    console.log('\n3. Testing SERP analysis...');
    const serpData = await client.getSerpResults('best wine pairing');
    
    if (serpData.results.length > 0) {
      console.log('✅ SERP data retrieved successfully');
      console.log('\nTop 3 results:');
      serpData.results.slice(0, 3).forEach(result => {
        console.log(`${result.position}. ${result.title}`);
        console.log(`   ${result.url}`);
      });
    }
    
    // Test 4: Keyword suggestions
    console.log('\n4. Testing keyword suggestions...');
    const suggestions = await client.getKeywordSuggestions('wine pairing');
    
    if (suggestions.length > 0) {
      console.log('✅ Keyword suggestions retrieved successfully');
      console.log(`Found ${suggestions.length} suggestions`);
      console.log('Sample suggestions:', suggestions.slice(0, 5));
    }
    
    console.log('\n🎉 All DataForSEO tests passed!');
    
  } catch (error) {
    console.error('❌ DataForSEO test failed:', error);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check your DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in .env');
    console.log('2. Ensure you have credits in your DataForSEO account');
    console.log('3. Verify your internet connection');
  }
}

// Run test
testDataForSEO();