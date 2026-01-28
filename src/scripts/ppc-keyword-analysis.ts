/**
 * PPC Keyword Analysis for Google Ads
 *
 * Generates:
 * 1. High-intent keywords scored for PPC
 * 2. Ad group structure with suggested ads
 * 3. Negative keyword lists
 * 4. CSV exports for Google Ads Editor
 * 5. Budget and ROAS estimates
 *
 * Usage:
 *   npx tsx src/scripts/ppc-keyword-analysis.ts [options]
 *
 * Options:
 *   --budget=N      Daily budget in dollars (default: 50)
 *   --export        Export CSV files for Google Ads
 *   --top=N         Show top N keywords (default: 30)
 */

import fs from 'fs';
import path from 'path';
import {
  runFreeKeywordResearch,
  getGoogleAutocompleteSuggestions,
  HIGH_VOLUME_WINE_SEEDS,
} from '../lib/free-keyword-tools.js';
import {
  processKeywordsForPPC,
  organizeIntoAdGroups,
  generatePPCCampaign,
  exportToGoogleAdsFormat,
  exportNegativeKeywords,
  HIGH_INTENT_PPC_SEEDS,
  PPC_NEGATIVE_KEYWORDS,
  type PPCKeyword,
  type AdGroup,
} from '../lib/ppc-keyword-tools.js';

// Parse CLI args
const args = process.argv.slice(2);
const budgetArg = args.find(a => a.startsWith('--budget='));
const dailyBudget = budgetArg ? parseInt(budgetArg.split('=')[1]) : 50;
const shouldExport = args.includes('--export');
const topArg = args.find(a => a.startsWith('--top='));
const topN = topArg ? parseInt(topArg.split('=')[1]) : 30;

async function runPPCAnalysis() {
  console.log('💰 PPC Keyword Analysis for Google Ads\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Daily Budget: $${dailyBudget}`);
  console.log(`Monthly Budget: $${dailyBudget * 30}\n`);

  // Step 1: Gather keywords from multiple sources
  console.log('📝 Step 1: Gathering high-intent keywords...\n');

  const allKeywords: string[] = [...HIGH_INTENT_PPC_SEEDS];

  // Add autocomplete suggestions for high-intent seeds
  const highIntentSeeds = [
    'buy wine online',
    'wine delivery',
    'wine subscription',
    'wine gift',
    'best wine under',
    'wine for thanksgiving',
    'wine for christmas',
  ];

  for (const seed of highIntentSeeds) {
    console.log(`   Getting suggestions for "${seed}"...`);
    const suggestions = await getGoogleAutocompleteSuggestions(seed, ['', 'near me', 'best', 'cheap']);
    allKeywords.push(...suggestions.map(s => s.keyword));
  }

  // Add some SEO keywords that might also work for PPC
  const seoKeywords = HIGH_VOLUME_WINE_SEEDS.filter(kw =>
    /with\s|pairing|under\s|best|gift|for\s/.test(kw)
  );
  allKeywords.push(...seoKeywords);

  // Deduplicate
  const uniqueKeywords = [...new Set(allKeywords)];
  console.log(`\n   Total unique keywords: ${uniqueKeywords.length}\n`);

  // Step 2: Process for PPC
  console.log('📊 Step 2: Scoring keywords for PPC potential...\n');
  const ppcKeywords = processKeywordsForPPC(uniqueKeywords);
  console.log(`   Keywords passing PPC threshold: ${ppcKeywords.length}\n`);

  // Step 3: Organize into ad groups
  console.log('📁 Step 3: Organizing into ad groups...\n');
  const adGroups = organizeIntoAdGroups(ppcKeywords);

  // Display ad groups
  console.log('   Ad Groups Created:');
  for (const group of adGroups) {
    const avgScore = Math.round(group.keywords.reduce((s, k) => s + k.ppcScore, 0) / group.keywords.length);
    console.log(`   • ${group.name}: ${group.keywords.length} keywords (avg score: ${avgScore})`);
  }

  // Step 4: Generate campaign structure
  console.log('\n📈 Step 4: Generating campaign structure...\n');
  const campaign = generatePPCCampaign(uniqueKeywords, dailyBudget);

  // Step 5: Display results
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎯 TOP PPC KEYWORDS (Sorted by PPC Score)');
  console.log('═══════════════════════════════════════════════════════════\n');

  ppcKeywords.slice(0, topN).forEach((kw, i) => {
    const intentEmoji = kw.intent === 'transactional' ? '💳' : kw.intent === 'commercial' ? '🛒' : 'ℹ️';
    console.log(`${String(i + 1).padStart(2)}. [Score: ${kw.ppcScore}] ${kw.keyword}`);
    console.log(`    ${intentEmoji} ${kw.intent} | CPC: $${kw.estimatedCPC} | Bid: $${kw.suggestedBid} | Conv: ${kw.conversionPotential}`);
    console.log(`    📁 ${kw.adGroup} → ${kw.landingPage}\n`);
  });

  // Display campaign estimates
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 CAMPAIGN ESTIMATES');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Budget:`);
  console.log(`  • Daily: $${campaign.budget.daily}`);
  console.log(`  • Monthly: $${campaign.budget.monthly}\n`);

  console.log(`Estimated Monthly Performance:`);
  console.log(`  • Impressions: ~${campaign.estimatedMetrics.impressions.toLocaleString()}`);
  console.log(`  • Clicks: ~${campaign.estimatedMetrics.clicks.toLocaleString()}`);
  console.log(`  • Conversions: ~${campaign.estimatedMetrics.conversions}`);
  console.log(`  • CPA (Cost Per Acquisition): $${campaign.estimatedMetrics.cpa}`);
  console.log(`  • ROAS: ${campaign.estimatedMetrics.roas}x\n`);

  // Display ad group details
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📁 AD GROUP DETAILS');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const group of campaign.adGroups.slice(0, 5)) {
    console.log(`\n🏷️  ${group.name} (${group.keywords.length} keywords)`);
    console.log('─────────────────────────────────────────');

    console.log('\nTop 5 Keywords:');
    group.keywords.slice(0, 5).forEach(kw => {
      console.log(`  • "${kw.keyword}" → $${kw.suggestedBid} CPC`);
    });

    console.log('\nSuggested Headlines:');
    group.suggestedHeadlines.slice(0, 3).forEach(h => {
      console.log(`  • ${h}`);
    });

    console.log('\nSuggested Descriptions:');
    group.suggestedDescriptions.slice(0, 1).forEach(d => {
      console.log(`  • ${d}`);
    });

    console.log('\nNegative Keywords:');
    console.log(`  • ${group.negativesKeywords.join(', ') || 'None specific'}`);
  }

  // Display negative keywords
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🚫 CAMPAIGN-LEVEL NEGATIVE KEYWORDS (Prevent Wasted Spend)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const negativeCategories = {
    'DIY/Homemade': PPC_NEGATIVE_KEYWORDS.filter(n => /make|homemade|recipe|diy/.test(n)),
    'Jobs/Careers': PPC_NEGATIVE_KEYWORDS.filter(n => /job|career|training|certification/.test(n)),
    'Informational': PPC_NEGATIVE_KEYWORDS.filter(n => /what is|history|definition|meaning/.test(n)),
    'Competitors': PPC_NEGATIVE_KEYWORDS.filter(n => /vivino|wine\.com|total wine|drizly/.test(n)),
    'Other': PPC_NEGATIVE_KEYWORDS.filter(n => /free|stain|hangover|headache|calorie/.test(n)),
  };

  for (const [category, negatives] of Object.entries(negativeCategories)) {
    if (negatives.length > 0) {
      console.log(`${category}:`);
      console.log(`  ${negatives.slice(0, 8).join(', ')}`);
      console.log('');
    }
  }

  // Export if requested
  if (shouldExport) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('💾 EXPORTING FILES');
    console.log('═══════════════════════════════════════════════════════════\n');

    const exportDir = path.join(process.cwd(), 'ppc-exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Export keywords CSV
    const keywordsCSV = exportToGoogleAdsFormat(campaign);
    const keywordsPath = path.join(exportDir, 'google-ads-keywords.csv');
    fs.writeFileSync(keywordsPath, keywordsCSV);
    console.log(`✅ Keywords exported: ${keywordsPath}`);

    // Export negative keywords
    const negativesCSV = exportNegativeKeywords(campaign);
    const negativesPath = path.join(exportDir, 'negative-keywords.csv');
    fs.writeFileSync(negativesPath, negativesCSV);
    console.log(`✅ Negative keywords exported: ${negativesPath}`);

    // Export ad copy suggestions
    const adCopyLines: string[] = ['Ad Group,Headline 1,Headline 2,Headline 3,Description 1,Description 2'];
    for (const group of campaign.adGroups) {
      adCopyLines.push(
        `${group.name},"${group.suggestedHeadlines[0]}","${group.suggestedHeadlines[1]}","${group.suggestedHeadlines[2]}","${group.suggestedDescriptions[0]}","${group.suggestedDescriptions[1] || ''}"`
      );
    }
    const adCopyPath = path.join(exportDir, 'ad-copy-suggestions.csv');
    fs.writeFileSync(adCopyPath, adCopyLines.join('\n'));
    console.log(`✅ Ad copy exported: ${adCopyPath}`);

    // Export full analysis JSON
    const analysisPath = path.join(exportDir, 'ppc-analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      budget: campaign.budget,
      estimates: campaign.estimatedMetrics,
      adGroups: campaign.adGroups.map(g => ({
        name: g.name,
        keywordCount: g.keywords.length,
        topKeywords: g.keywords.slice(0, 10).map(k => ({
          keyword: k.keyword,
          ppcScore: k.ppcScore,
          suggestedBid: k.suggestedBid,
          landingPage: k.landingPage,
        })),
        headlines: g.suggestedHeadlines,
        descriptions: g.suggestedDescriptions,
      })),
      negativeKeywords: campaign.campaignNegatives,
    }, null, 2));
    console.log(`✅ Full analysis exported: ${analysisPath}`);

    console.log(`\n📂 All exports saved to: ${exportDir}`);
  }

  // Recommendations
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('💡 RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('1. START SMALL: Begin with 1-2 ad groups (Wine Gifts + Budget Wine)');
  console.log('   These have highest intent and clearest landing pages.\n');

  console.log('2. USE PHRASE MATCH: Start with phrase match for control,');
  console.log('   then expand to broad match modifier once you have data.\n');

  console.log('3. SET UP CONVERSION TRACKING: Before spending money,');
  console.log('   install Google Ads conversion tracking on purchase/signup pages.\n');

  console.log('4. LANDING PAGE ALIGNMENT: Create dedicated landing pages');
  console.log('   that match ad group intent (don\'t send gift traffic to homepage).\n');

  console.log('5. USE GOOGLE KEYWORD PLANNER: Get exact CPC and volume data');
  console.log('   by importing these keywords into Google Keyword Planner (free).\n');

  console.log('6. SEASONAL TIMING: "Wine gift" and "thanksgiving wine" keywords');
  console.log('   spike Oct-Dec. Increase budgets 2x during holidays.\n');

  if (!shouldExport) {
    console.log('💾 Run with --export flag to generate CSV files for Google Ads import\n');
  }
}

// Run
runPPCAnalysis()
  .then(() => {
    console.log('✅ PPC analysis complete!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
