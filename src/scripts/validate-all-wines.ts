/**
 * Wine Validation Migration Script
 *
 * Scans all existing articles and validates wine recommendations
 * against the wine catalog. Generates a report of invalid wines.
 *
 * Usage:
 *   npx tsx src/scripts/validate-all-wines.ts [options]
 *
 * Options:
 *   --json            Output as JSON (for piping to file)
 *   --fix             Remove wine sections with invalid wines
 *   --category=X      Only process articles in category (learn|wine-pairings|buy)
 *   --verbose         Show detailed output
 */

import { config } from 'dotenv';
config({ path: '.env.local', override: true });

import fs from 'fs';
import path from 'path';
import { validateWinesInCatalog, testWineCatalogConnection } from '../lib/wine-catalog.js';

// Parse CLI args
const args = process.argv.slice(2);
const outputJson = args.includes('--json');
const doFix = args.includes('--fix');
const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1];
const verbose = args.includes('--verbose');

interface ArticleWineReport {
  slug: string;
  category: string;
  filePath: string;
  wineCount: number;
  validWines: string[];
  invalidWines: string[];
  allValid: boolean;
}

interface ValidationReport {
  timestamp: string;
  totalArticles: number;
  articlesWithWines: number;
  articlesWithInvalidWines: number;
  totalWines: number;
  validWines: number;
  invalidWines: number;
  articles: ArticleWineReport[];
  invalidWinesList: { wine: string; articles: string[] }[];
}

/**
 * Check if a string looks like a valid wine name
 * Filters out FAQ questions and other non-wine content
 */
function isValidWineName(name: string): boolean {
  // Too short to be a wine name
  if (name.length < 5) return false;

  // Too long - probably a sentence
  if (name.length > 100) return false;

  // Contains question mark - likely an FAQ
  if (name.includes('?')) return false;

  // Starts with common question words
  const questionStarts = ['how ', 'what ', 'why ', 'when ', 'where ', 'which ', 'can ', 'should ', 'is ', 'are ', 'do ', 'does ', 'if '];
  const lowerName = name.toLowerCase();
  if (questionStarts.some(q => lowerName.startsWith(q))) return false;

  // Contains words that suggest it's not a wine name
  const invalidPhrases = ['how to', 'best way', 'good for', 'pair with', 'serve with', 'try first', 'how long'];
  if (invalidPhrases.some(phrase => lowerName.includes(phrase))) return false;

  return true;
}

/**
 * Extract wine names from article content
 */
function extractWineNames(content: string): string[] {
  const wineNames: string[] = [];

  // Pattern 1: <h3>N. Wine Name</h3>
  const h3Pattern = /<h3[^>]*>[\d]+\.\s*([^<]+)<\/h3>/g;
  let match;
  while ((match = h3Pattern.exec(content)) !== null) {
    const name = match[1].trim();
    if (isValidWineName(name)) {
      wineNames.push(name);
    }
  }

  // Pattern 2: Wine cards with class="text-lg font-semibold"
  const cardPattern = /<h3[^>]*class="[^"]*text-lg font-semibold[^"]*"[^>]*>([^<]+)<\/h3>/g;
  while ((match = cardPattern.exec(content)) !== null) {
    const name = match[1].trim();
    if (!wineNames.includes(name) && !name.match(/^\d+\./) && isValidWineName(name)) {
      wineNames.push(name);
    }
  }

  return wineNames;
}

/**
 * Remove wine recommendation sections from article
 */
function removeWineSection(content: string): string {
  // Remove "More Excellent Options" section
  let updated = content.replace(
    /<h2>More Excellent Options<\/h2>\s*<div class="grid[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?=<h2|<!--)/g,
    ''
  );

  // Remove "Our Top Picks" section with invalid wines
  // (This is more aggressive - only enable if needed)
  // updated = updated.replace(
  //   /<h2>Our Top Picks<\/h2>[\s\S]*?(?=<h2>|<!-- Related)/g,
  //   ''
  // );

  return updated;
}

/**
 * Scan all articles and collect wine data
 */
async function scanArticles(): Promise<ArticleWineReport[]> {
  const reports: ArticleWineReport[] = [];
  const pagesDir = path.join(process.cwd(), 'src/pages');
  const categories = categoryFilter ? [categoryFilter] : ['learn', 'wine-pairings', 'buy'];

  for (const category of categories) {
    const categoryDir = path.join(pagesDir, category);
    if (!fs.existsSync(categoryDir)) continue;

    const files = fs.readdirSync(categoryDir);
    for (const file of files) {
      if (!file.endsWith('.astro') || file === 'index.astro' || file.startsWith('[')) {
        continue;
      }

      const slug = file.replace('.astro', '');
      const filePath = path.join(categoryDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      const wineNames = extractWineNames(content);

      if (wineNames.length === 0) {
        reports.push({
          slug,
          category,
          filePath,
          wineCount: 0,
          validWines: [],
          invalidWines: [],
          allValid: true,
        });
        continue;
      }

      if (verbose) {
        console.log(`Validating ${category}/${slug} (${wineNames.length} wines)...`);
      }

      try {
        const validation = await validateWinesInCatalog(wineNames);
        reports.push({
          slug,
          category,
          filePath,
          wineCount: wineNames.length,
          validWines: validation.valid,
          invalidWines: validation.invalid,
          allValid: validation.invalid.length === 0,
        });
      } catch (err: any) {
        if (verbose) {
          console.error(`  Error validating: ${err.message}`);
        }
        reports.push({
          slug,
          category,
          filePath,
          wineCount: wineNames.length,
          validWines: [],
          invalidWines: wineNames, // Assume all invalid on error
          allValid: false,
        });
      }
    }
  }

  return reports;
}

/**
 * Generate validation report
 */
function generateReport(articles: ArticleWineReport[]): ValidationReport {
  const articlesWithWines = articles.filter(a => a.wineCount > 0);
  const articlesWithInvalidWines = articles.filter(a => a.invalidWines.length > 0);

  // Count all wines
  const totalWines = articles.reduce((sum, a) => sum + a.wineCount, 0);
  const validWines = articles.reduce((sum, a) => sum + a.validWines.length, 0);
  const invalidWines = articles.reduce((sum, a) => sum + a.invalidWines.length, 0);

  // Group invalid wines by name
  const invalidWineMap = new Map<string, string[]>();
  for (const article of articles) {
    for (const wine of article.invalidWines) {
      const existing = invalidWineMap.get(wine) || [];
      existing.push(`${article.category}/${article.slug}`);
      invalidWineMap.set(wine, existing);
    }
  }

  const invalidWinesList = Array.from(invalidWineMap.entries())
    .map(([wine, articleList]) => ({ wine, articles: articleList }))
    .sort((a, b) => b.articles.length - a.articles.length);

  return {
    timestamp: new Date().toISOString(),
    totalArticles: articles.length,
    articlesWithWines: articlesWithWines.length,
    articlesWithInvalidWines: articlesWithInvalidWines.length,
    totalWines,
    validWines,
    invalidWines,
    articles: articlesWithInvalidWines,
    invalidWinesList,
  };
}

/**
 * Fix articles with invalid wines
 */
function fixArticles(report: ValidationReport): number {
  let fixed = 0;

  for (const article of report.articles) {
    const content = fs.readFileSync(article.filePath, 'utf-8');
    const updated = removeWineSection(content);

    if (updated !== content) {
      fs.writeFileSync(article.filePath, updated);
      console.log(`Fixed: ${article.category}/${article.slug}`);
      fixed++;
    }
  }

  return fixed;
}

/**
 * Main execution
 */
async function main() {
  console.log('🍷 Wine Validation Migration\n');

  // Test catalog connection
  console.log('Testing wine catalog connection...');
  const connectionTest = await testWineCatalogConnection();
  if (!connectionTest.success) {
    console.error(`❌ Failed to connect to wine catalog: ${connectionTest.error}`);
    console.log('\nMake sure WINE_CATALOG_URL and WINE_CATALOG_ANON_KEY are set in .env.local');
    process.exit(1);
  }
  console.log(`✅ Connected to wine catalog (${connectionTest.count} wines)\n`);

  // Scan articles
  console.log('Scanning articles...');
  const articles = await scanArticles();

  // Generate report
  const report = generateReport(articles);

  if (outputJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Pretty print report
  console.log('\n' + '═'.repeat(60));
  console.log('📊 WINE VALIDATION REPORT');
  console.log('═'.repeat(60));

  console.log(`\n📋 Summary:`);
  console.log(`   Total articles:          ${report.totalArticles}`);
  console.log(`   Articles with wines:     ${report.articlesWithWines}`);
  console.log(`   Articles with issues:    ${report.articlesWithInvalidWines}`);
  console.log(`\n🍷 Wine Stats:`);
  console.log(`   Total wines found:       ${report.totalWines}`);
  console.log(`   Valid (in catalog):      ${report.validWines}`);
  console.log(`   Invalid (not found):     ${report.invalidWines}`);

  if (report.articles.length > 0) {
    console.log(`\n⚠️  ARTICLES WITH INVALID WINES:\n`);
    for (const article of report.articles) {
      console.log(`   ${article.category}/${article.slug}`);
      console.log(`      Valid: ${article.validWines.length}, Invalid: ${article.invalidWines.length}`);
      for (const wine of article.invalidWines.slice(0, 3)) {
        console.log(`      ❌ ${wine}`);
      }
      if (article.invalidWines.length > 3) {
        console.log(`      ... and ${article.invalidWines.length - 3} more`);
      }
      console.log('');
    }
  }

  if (report.invalidWinesList.length > 0) {
    console.log(`\n🔍 MOST COMMON INVALID WINES:\n`);
    for (const { wine, articles: articleList } of report.invalidWinesList.slice(0, 10)) {
      console.log(`   "${wine}" (${articleList.length} articles)`);
    }
  }

  // Fix if requested
  if (doFix && report.articles.length > 0) {
    console.log('\n🔧 Fixing articles...');
    const fixed = fixArticles(report);
    console.log(`Fixed ${fixed} articles`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(report.articlesWithInvalidWines === 0
    ? '✅ All wines validated successfully!'
    : `⚠️  ${report.articlesWithInvalidWines} article(s) need attention`);
  console.log('═'.repeat(60) + '\n');

  if (!doFix && report.articles.length > 0) {
    console.log('Run with --fix to remove wine sections with invalid wines\n');
  }
}

main().catch(console.error);
