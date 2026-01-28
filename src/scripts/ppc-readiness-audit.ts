/**
 * PPC Readiness Audit
 *
 * Checks if your site is ready for Google Ads campaigns:
 * - Landing page coverage for target keywords
 * - Page load speed indicators
 * - Conversion tracking setup
 * - Content quality for Quality Score
 * - Mobile optimization
 * - Seasonal timing recommendations
 *
 * Usage:
 *   npx tsx src/scripts/ppc-readiness-audit.ts
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import {
  detectSeasonality,
  getCurrentMonthRecommendation,
  getSeasonalCalendar,
  getOptimizedBudgetAllocation,
} from '../lib/seasonality.js';
import {
  HIGH_INTENT_PPC_SEEDS,
  determineAdGroup,
  suggestLandingPage,
} from '../lib/ppc-keyword-tools.js';

config({ path: '.env.local', override: true });

// Types
interface LandingPageAudit {
  path: string;
  exists: boolean;
  wordCount: number;
  hasH1: boolean;
  hasMetaDescription: boolean;
  hasFAQ: boolean;
  hasSchema: boolean;
  qualityScore: number;
  issues: string[];
}

interface PPCReadinessReport {
  overallScore: number;
  landingPages: {
    total: number;
    existing: number;
    missing: string[];
    audits: LandingPageAudit[];
  };
  conversionTracking: {
    ready: boolean;
    issues: string[];
    recommendations: string[];
  };
  seasonalTiming: {
    currentMonth: string;
    recommendation: string;
    upcomingOpportunities: string[];
    budgetAllocation: Map<number, number>;
  };
  adGroups: {
    name: string;
    keywordCount: number;
    landingPageReady: boolean;
    seasonalStatus: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  actionItems: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    item: string;
    impact: string;
  }[];
}

// ============================================================================
// Audit Functions
// ============================================================================

function getExistingPages(): Set<string> {
  const pages = new Set<string>();
  const pagesDir = path.join(process.cwd(), 'src/pages');

  const scanDir = (dir: string, prefix: string = '') => {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('[') && !file.startsWith('_')) {
        scanDir(filePath, prefix + '/' + file);
      } else if (file.endsWith('.astro') || file.endsWith('.mdx')) {
        const slug = file.replace(/\.(astro|mdx)$/, '');
        if (slug !== 'index') {
          pages.add(prefix + '/' + slug);
        } else {
          pages.add(prefix || '/');
        }
      }
    }
  };

  scanDir(pagesDir);
  return pages;
}

function auditLandingPage(pagePath: string, pagesDir: string): LandingPageAudit {
  const audit: LandingPageAudit = {
    path: pagePath,
    exists: false,
    wordCount: 0,
    hasH1: false,
    hasMetaDescription: false,
    hasFAQ: false,
    hasSchema: false,
    qualityScore: 0,
    issues: [],
  };

  // Try to find the file
  const possiblePaths = [
    path.join(pagesDir, pagePath + '.astro'),
    path.join(pagesDir, pagePath + '.mdx'),
    path.join(pagesDir, pagePath, 'index.astro'),
  ];

  let content = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      audit.exists = true;
      content = fs.readFileSync(p, 'utf-8');
      break;
    }
  }

  if (!audit.exists) {
    audit.issues.push('Landing page does not exist');
    audit.qualityScore = 0;
    return audit;
  }

  // Check content quality
  const textContent = content
    .replace(/---[\s\S]*?---/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  audit.wordCount = textContent.split(' ').filter(w => w.length > 0).length;

  if (audit.wordCount < 300) {
    audit.issues.push('Page has less than 300 words (thin content)');
  } else if (audit.wordCount < 800) {
    audit.issues.push('Page has less than 800 words (consider expanding)');
  }

  // Check for H1
  audit.hasH1 = /<h1|<H1|title:/.test(content);
  if (!audit.hasH1) {
    audit.issues.push('Missing H1 heading');
  }

  // Check for meta description
  audit.hasMetaDescription = /description:|meta.*description/.test(content);
  if (!audit.hasMetaDescription) {
    audit.issues.push('Missing meta description');
  }

  // Check for FAQ section
  audit.hasFAQ = /FAQ|Frequently Asked|<h[23].*\?.*<\/h[23]>/i.test(content);

  // Check for schema
  audit.hasSchema = /schema|@type|structured_data|json-ld/i.test(content);
  if (!audit.hasSchema) {
    audit.issues.push('Missing structured data/schema');
  }

  // Calculate quality score (0-100)
  let score = 40; // Base
  if (audit.wordCount >= 300) score += 10;
  if (audit.wordCount >= 800) score += 10;
  if (audit.wordCount >= 1500) score += 10;
  if (audit.hasH1) score += 10;
  if (audit.hasMetaDescription) score += 10;
  if (audit.hasFAQ) score += 5;
  if (audit.hasSchema) score += 5;

  audit.qualityScore = Math.min(100, score);

  return audit;
}

function checkConversionTracking(pagesDir: string): { ready: boolean; issues: string[]; recommendations: string[] } {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for common tracking implementations
  const layoutPath = path.join(pagesDir, '../layouts');
  const componentsPath = path.join(pagesDir, '../components');

  let hasGoogleTag = false;
  let hasConversionPixel = false;

  const searchDirs = [layoutPath, componentsPath, pagesDir];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith('.astro') && !file.endsWith('.tsx')) continue;

      const content = fs.readFileSync(path.join(dir, file), 'utf-8');

      if (/gtag|googletagmanager|GA4|G-[A-Z0-9]+/i.test(content)) {
        hasGoogleTag = true;
      }
      if (/conversion|purchase|AW-[0-9]+/i.test(content)) {
        hasConversionPixel = true;
      }
    }
  }

  if (!hasGoogleTag) {
    issues.push('Google Analytics/Tag Manager not detected');
    recommendations.push('Install Google Analytics 4 (GA4) for traffic tracking');
  }

  if (!hasConversionPixel) {
    issues.push('Google Ads conversion tracking not detected');
    recommendations.push('Set up Google Ads conversion tracking before spending on ads');
    recommendations.push('Track: purchases, email signups, add-to-cart events');
  }

  // Check for thank-you/confirmation pages
  const thankYouPages = ['thank-you', 'thanks', 'confirmation', 'success', 'order-complete'];
  const existingPages = getExistingPages();
  const hasThankYou = thankYouPages.some(p =>
    [...existingPages].some(page => page.includes(p))
  );

  if (!hasThankYou) {
    issues.push('No thank-you/confirmation page detected');
    recommendations.push('Create dedicated thank-you pages for conversion tracking');
  }

  return {
    ready: issues.length === 0,
    issues,
    recommendations,
  };
}

function getSeasonalRecommendations(keywords: string[]): {
  currentMonth: string;
  recommendation: string;
  upcomingOpportunities: string[];
  budgetAllocation: Map<number, number>;
} {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonth = new Date().getMonth() + 1;
  const currentMonthName = monthNames[currentMonth - 1];

  // Get seasonal calendar
  const calendar = getSeasonalCalendar();
  const currentEvents = calendar.get(currentMonth) || [];

  // Get recommendations for top keywords
  const recommendations: string[] = [];
  for (const kw of keywords.slice(0, 10)) {
    const rec = getCurrentMonthRecommendation(kw);
    if (rec.budgetMultiplier > 1.5) {
      recommendations.push(`"${kw}" - ${rec.reason}`);
    }
  }

  // Get upcoming opportunities (next 3 months)
  const upcomingOpportunities: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const upcomingMonth = ((currentMonth - 1 + i) % 12) + 1;
    const events = calendar.get(upcomingMonth) || [];
    if (events.length > 0) {
      upcomingOpportunities.push(`${monthNames[upcomingMonth - 1]}: ${events[0]}`);
    }
  }

  // Get budget allocation
  const budgetAllocation = getOptimizedBudgetAllocation(1000, keywords);

  let recommendation = `Current month: ${currentMonthName}\n`;
  recommendation += `Events this month: ${currentEvents.join(', ')}\n\n`;

  if (recommendations.length > 0) {
    recommendation += `High-opportunity keywords right now:\n`;
    recommendation += recommendations.map(r => `  • ${r}`).join('\n');
  } else {
    recommendation += `No peak-season keywords this month. Good time to build Quality Score.`;
  }

  return {
    currentMonth: currentMonthName,
    recommendation,
    upcomingOpportunities,
    budgetAllocation,
  };
}

// ============================================================================
// Main Audit
// ============================================================================

async function runPPCReadinessAudit() {
  console.log('🔍 PPC Readiness Audit\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  const pagesDir = path.join(process.cwd(), 'src/pages');
  const existingPages = getExistingPages();

  console.log(`📄 Found ${existingPages.size} existing pages\n`);

  // 1. Analyze landing page coverage
  console.log('📋 Step 1: Auditing landing page coverage...\n');

  const requiredLandingPages = [
    '/shop',
    '/gifts',
    '/subscription',
    '/buy',
    '/buy/best-wines-under-20',
    '/buy/best-wines-under-30',
    '/wine-pairings',
    '/wine-pairings/wine-with-steak',
    '/wine-pairings/wine-with-salmon',
    '/wine-pairings/wine-with-chicken',
    '/wine-pairings/wine-for-thanksgiving',
    '/learn',
  ];

  const landingPageAudits: LandingPageAudit[] = [];
  const missingPages: string[] = [];

  for (const page of requiredLandingPages) {
    const audit = auditLandingPage(page, pagesDir);
    landingPageAudits.push(audit);

    if (!audit.exists) {
      missingPages.push(page);
    }
  }

  console.log(`   Existing: ${landingPageAudits.filter(a => a.exists).length}/${requiredLandingPages.length}`);
  console.log(`   Missing: ${missingPages.length}\n`);

  if (missingPages.length > 0) {
    console.log('   ❌ Missing landing pages:');
    missingPages.forEach(p => console.log(`      • ${p}`));
    console.log('');
  }

  // 2. Check conversion tracking
  console.log('📋 Step 2: Checking conversion tracking...\n');

  const conversionCheck = checkConversionTracking(pagesDir);

  if (conversionCheck.ready) {
    console.log('   ✅ Conversion tracking appears ready\n');
  } else {
    console.log('   ⚠️  Conversion tracking issues:');
    conversionCheck.issues.forEach(i => console.log(`      • ${i}`));
    console.log('');
  }

  // 3. Seasonal timing analysis
  console.log('📋 Step 3: Analyzing seasonal timing...\n');

  const sampleKeywords = HIGH_INTENT_PPC_SEEDS.slice(0, 20);
  const seasonalRecs = getSeasonalRecommendations(sampleKeywords);

  console.log(`   ${seasonalRecs.recommendation}\n`);

  console.log('   📅 Upcoming opportunities:');
  seasonalRecs.upcomingOpportunities.forEach(o => console.log(`      • ${o}`));
  console.log('');

  // 4. Ad group readiness
  console.log('📋 Step 4: Assessing ad group readiness...\n');

  const adGroupReadiness = [
    { name: 'Wine Gifts', landingPage: '/gifts', keywords: HIGH_INTENT_PPC_SEEDS.filter(k => /gift/.test(k)) },
    { name: 'Wine Subscription', landingPage: '/subscription', keywords: HIGH_INTENT_PPC_SEEDS.filter(k => /subscription|club/.test(k)) },
    { name: 'Budget Wine', landingPage: '/buy/best-wines-under-20', keywords: HIGH_INTENT_PPC_SEEDS.filter(k => /under|cheap|affordable/.test(k)) },
    { name: 'Wine Delivery', landingPage: '/shop', keywords: HIGH_INTENT_PPC_SEEDS.filter(k => /delivery|online|order/.test(k)) },
    { name: 'Wine Pairings', landingPage: '/wine-pairings', keywords: HIGH_INTENT_PPC_SEEDS.filter(k => /pairing|with /.test(k)) },
  ];

  for (const group of adGroupReadiness) {
    const pageAudit = landingPageAudits.find(a => a.path === group.landingPage);
    const ready = pageAudit?.exists && (pageAudit?.qualityScore || 0) >= 60;

    const seasonality = detectSeasonality(group.keywords[0] || group.name);
    const currentMonth = new Date().getMonth() + 1;
    const isPeak = seasonality.peakMonths.includes(currentMonth);
    const isLow = seasonality.lowMonths.includes(currentMonth);

    const status = isPeak ? '🔥 Peak Season' : isLow ? '❄️ Low Season' : '📊 Normal';

    console.log(`   ${ready ? '✅' : '❌'} ${group.name}`);
    console.log(`      Keywords: ${group.keywords.length} | Landing: ${pageAudit?.exists ? 'Yes' : 'MISSING'} | ${status}`);
    if (pageAudit?.exists) {
      console.log(`      Quality Score Potential: ${pageAudit.qualityScore}/100`);
    }
    console.log('');
  }

  // 5. Generate action items
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 ACTION ITEMS (Prioritized)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const actionItems: { priority: string; item: string; impact: string }[] = [];

  // Critical: Conversion tracking
  if (!conversionCheck.ready) {
    actionItems.push({
      priority: '🔴 CRITICAL',
      item: 'Set up Google Ads conversion tracking',
      impact: 'Cannot measure ROI without this',
    });
  }

  // High: Missing landing pages
  for (const page of missingPages.slice(0, 3)) {
    actionItems.push({
      priority: '🟠 HIGH',
      item: `Create landing page: ${page}`,
      impact: 'Required for ad relevance and Quality Score',
    });
  }

  // Medium: Low quality pages
  for (const audit of landingPageAudits.filter(a => a.exists && a.qualityScore < 60)) {
    actionItems.push({
      priority: '🟡 MEDIUM',
      item: `Improve page quality: ${audit.path} (score: ${audit.qualityScore})`,
      impact: audit.issues.join(', '),
    });
  }

  // Low: Optimization
  for (const audit of landingPageAudits.filter(a => a.exists && !a.hasFAQ)) {
    actionItems.push({
      priority: '🟢 LOW',
      item: `Add FAQ section to ${audit.path}`,
      impact: 'Improves content depth and potential featured snippets',
    });
  }

  actionItems.forEach((item, i) => {
    console.log(`${i + 1}. ${item.priority}: ${item.item}`);
    console.log(`   Impact: ${item.impact}\n`);
  });

  // 6. Overall readiness score
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 OVERALL PPC READINESS SCORE');
  console.log('═══════════════════════════════════════════════════════════\n');

  let score = 0;
  const maxScore = 100;

  // Landing pages (40 points)
  const existingLandingPages = landingPageAudits.filter(a => a.exists).length;
  score += (existingLandingPages / requiredLandingPages.length) * 40;

  // Landing page quality (20 points)
  const avgQuality = landingPageAudits
    .filter(a => a.exists)
    .reduce((sum, a) => sum + a.qualityScore, 0) / (existingLandingPages || 1);
  score += (avgQuality / 100) * 20;

  // Conversion tracking (30 points)
  if (conversionCheck.ready) {
    score += 30;
  } else if (conversionCheck.issues.length === 1) {
    score += 15;
  }

  // Schema/structured data (10 points)
  const pagesWithSchema = landingPageAudits.filter(a => a.hasSchema).length;
  score += (pagesWithSchema / requiredLandingPages.length) * 10;

  const finalScore = Math.round(score);

  console.log(`   Score: ${finalScore}/${maxScore}\n`);

  if (finalScore >= 80) {
    console.log('   ✅ READY FOR PPC');
    console.log('   Your site is well-prepared for Google Ads campaigns.\n');
  } else if (finalScore >= 60) {
    console.log('   ⚠️  MOSTLY READY');
    console.log('   Address the high-priority items before launching campaigns.\n');
  } else if (finalScore >= 40) {
    console.log('   🟡 NEEDS WORK');
    console.log('   Several improvements needed before PPC will be effective.\n');
  } else {
    console.log('   🔴 NOT READY');
    console.log('   Significant preparation needed. Focus on critical items first.\n');
  }

  // Budget recommendation
  console.log('═══════════════════════════════════════════════════════════');
  console.log('💰 BUDGET RECOMMENDATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  console.log('   Recommended monthly budget allocation ($1000/month example):\n');

  for (const [month, budget] of seasonalRecs.budgetAllocation) {
    const bar = '█'.repeat(Math.round(budget / 50));
    console.log(`   ${monthNames[month - 1].padEnd(4)} $${budget.toString().padStart(4)} ${bar}`);
  }

  console.log('\n   Note: Actual budget depends on your goals and margins.');
  console.log('   Wine industry benchmarks: $2-5 CPC, 2-4% conversion rate.\n');

  // Next steps
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📌 NEXT STEPS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('1. Complete action items above (especially CRITICAL and HIGH)\n');

  console.log('2. Get real keyword data:');
  console.log('   • Create Google Ads account (free, no spending required)');
  console.log('   • Go to Tools → Keyword Planner → Get search volumes');
  console.log('   • Upload: ppc-exports/google-ads-keywords.csv');
  console.log('   • Download with real CPCs and volumes');
  console.log('   • Run: npm run keywords:import-planner <downloaded-file>\n');

  console.log('3. Set up conversion tracking:');
  console.log('   • Install Google Ads tag on your site');
  console.log('   • Create conversion actions (purchase, signup, etc.)');
  console.log('   • Test conversions before spending money\n');

  console.log('4. When ready to launch:');
  console.log('   • Start with 1-2 ad groups only');
  console.log('   • Set conservative daily budget ($20-50)');
  console.log('   • Monitor for 2 weeks before scaling\n');
}

// Run
runPPCReadinessAudit()
  .then(() => {
    console.log('✅ Audit complete!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
