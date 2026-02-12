/**
 * Article QA Scoring System
 *
 * Automatically scores articles on multiple dimensions to determine
 * if they're ready for publishing without human review.
 *
 * Scoring Dimensions:
 * - Word count (target: 1500-3000)
 * - Structure (H2s, intro, conclusion)
 * - SEO (meta, schema, internal links)
 * - Content quality (readability, wine recommendations)
 * - Technical validity (valid Astro syntax)
 *
 * Usage:
 *   npx tsx src/scripts/qa-score-article.ts [options]
 *
 * Options:
 *   --article=slug    Score a specific article
 *   --category=X      Score articles in category
 *   --all             Score all articles
 *   --json            Output as JSON
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { validateWinesInCatalog } from '../lib/wine-catalog.js';

config({ path: '.env.local', override: true });

// Parse CLI args
const args = process.argv.slice(2);
const specificArticle = args.find(a => a.startsWith('--article='))?.split('=')[1];
const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1];
const scoreAll = args.includes('--all');
const outputJson = args.includes('--json');
const validateWines = args.includes('--validate-wines');

export interface QAScore {
  slug: string;
  category: string;
  filePath: string;
  scores: {
    wordCount: number;        // 0-100
    structure: number;        // 0-100
    seo: number;              // 0-100
    contentQuality: number;   // 0-100
    technicalValidity: number; // 0-100
    wineValidity: number;     // 0-100 (only when --validate-wines)
  };
  totalScore: number;         // Weighted average 0-100
  status: 'pass' | 'review' | 'fail';
  issues: string[];
  metrics: {
    wordCount: number;
    h2Count: number;
    wineCount: number;
    hasImage: boolean;
    hasSchema: boolean;
    hasMeta: boolean;
    readTimeMinutes: number;
    validWines?: number;      // Only when --validate-wines
    invalidWines?: string[];  // Only when --validate-wines
  };
}

// Thresholds
const PASS_THRESHOLD = 80;
const FAIL_THRESHOLD = 60;

/**
 * Score word count (target: 1500-3000 words)
 */
function scoreWordCount(wordCount: number): { score: number; issues: string[] } {
  const issues: string[] = [];

  if (wordCount < 500) {
    issues.push(`Word count critically low: ${wordCount} (min: 500)`);
    return { score: 20, issues };
  }
  if (wordCount < 1000) {
    issues.push(`Word count low: ${wordCount} (target: 1500+)`);
    return { score: 50, issues };
  }
  if (wordCount < 1500) {
    issues.push(`Word count below target: ${wordCount} (target: 1500+)`);
    return { score: 70, issues };
  }
  if (wordCount > 4000) {
    issues.push(`Word count excessive: ${wordCount} (max: 4000)`);
    return { score: 80, issues };
  }
  if (wordCount >= 1500 && wordCount <= 3000) {
    return { score: 100, issues };
  }
  return { score: 90, issues };
}

/**
 * Score article structure
 */
function scoreStructure(content: string): { score: number; issues: string[]; h2Count: number } {
  const issues: string[] = [];
  let score = 100;

  // Count H2 headings
  const h2Matches = content.match(/<h2[^>]*>/g) || [];
  const h2Count = h2Matches.length;

  if (h2Count < 3) {
    issues.push(`Too few H2 sections: ${h2Count} (min: 3)`);
    score -= 30;
  } else if (h2Count < 4) {
    issues.push(`Could use more H2 sections: ${h2Count}`);
    score -= 10;
  }

  // Check for key sections
  const hasQuickAnswer = content.includes('slot="quick-answer"') || content.includes('Quick Answer');
  const hasExpertTips = content.includes('Expert Tips');
  const hasFAQs = content.includes('Frequently Asked Questions') || content.includes('FAQ');
  const hasAuthorBio = content.includes('About the Author') || content.includes('author');

  if (!hasQuickAnswer) {
    issues.push('Missing quick answer section');
    score -= 15;
  }
  if (!hasExpertTips) {
    issues.push('Missing expert tips section');
    score -= 10;
  }
  if (!hasFAQs) {
    issues.push('Missing FAQ section');
    score -= 10;
  }
  if (!hasAuthorBio) {
    issues.push('Missing author attribution');
    score -= 5;
  }

  return { score: Math.max(0, score), issues, h2Count };
}

/**
 * Score SEO elements
 */
function scoreSEO(content: string): { score: number; issues: string[]; hasSchema: boolean; hasMeta: boolean } {
  const issues: string[] = [];
  let score = 100;

  // Check meta description
  const hasMetaDesc = /description:\s*["'][^"']{50,160}["']/.test(content);
  if (!hasMetaDesc) {
    issues.push('Missing or invalid meta description (50-160 chars)');
    score -= 20;
  }

  // Check title
  const hasTitleTag = /title:\s*["'][^"']+["']/.test(content);
  if (!hasTitleTag) {
    issues.push('Missing title');
    score -= 20;
  }

  // Check schema/structured data
  const hasSchema = content.includes('structured_data') || content.includes('@type');
  if (!hasSchema) {
    issues.push('Missing structured data/schema');
    score -= 15;
  }

  // Check canonical URL
  const hasCanonical = content.includes('canonicalUrl');
  if (!hasCanonical) {
    issues.push('Missing canonical URL');
    score -= 10;
  }

  // Check keywords
  const hasKeywords = /keywords:\s*\[/.test(content);
  if (!hasKeywords) {
    issues.push('Missing keywords array');
    score -= 10;
  }

  // Check for internal links (looking for relative links)
  const internalLinkPattern = /href=["']\/[^"']+["']/g;
  const internalLinks = content.match(internalLinkPattern) || [];
  if (internalLinks.length < 2) {
    issues.push(`Few internal links: ${internalLinks.length} (target: 3+)`);
    score -= 10;
  }

  return { score: Math.max(0, score), issues, hasSchema, hasMeta: hasMetaDesc };
}

/**
 * Score content quality
 */
function scoreContentQuality(content: string): { score: number; issues: string[]; wineCount: number } {
  const issues: string[] = [];
  let score = 100;

  // Count wine recommendations
  const wineMatches = content.match(/<h3[^>]*>[\d]+\./g) || [];
  const wineCount = wineMatches.length;

  if (wineCount < 2) {
    issues.push(`Too few wine recommendations: ${wineCount} (min: 3)`);
    score -= 25;
  } else if (wineCount < 3) {
    issues.push(`Could use more wine recommendations: ${wineCount}`);
    score -= 10;
  }

  // Check for duplicate content indicators
  const duplicatePatterns = [
    /Discover the best best /,
    /(\b\w{4,}\b)\s+\1/g, // Repeated words
  ];

  for (const pattern of duplicatePatterns) {
    if (pattern.test(content)) {
      issues.push('Potential duplicate/repeated content detected');
      score -= 10;
      break;
    }
  }

  // Check for placeholder content
  const placeholders = ['TODO', 'FIXME', 'Lorem ipsum', '[placeholder]', 'TBD'];
  for (const placeholder of placeholders) {
    if (content.includes(placeholder)) {
      issues.push(`Contains placeholder: ${placeholder}`);
      score -= 20;
    }
  }

  // Check for broken references
  if (content.includes('undefined') || content.includes('null')) {
    issues.push('Contains undefined/null references');
    score -= 15;
  }

  return { score: Math.max(0, score), issues, wineCount };
}

/**
 * Score technical validity
 */
function scoreTechnicalValidity(content: string, filePath: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;

  // Check frontmatter
  const hasFrontmatter = content.startsWith('---') && content.includes('---', 4);
  if (!hasFrontmatter) {
    issues.push('Missing or invalid frontmatter');
    score -= 30;
  }

  // Check ArticleLayout wrapper
  const hasLayout = content.includes('<ArticleLayout') && content.includes('</ArticleLayout>');
  if (!hasLayout) {
    issues.push('Missing ArticleLayout wrapper');
    score -= 25;
  }

  // Check for unclosed tags (basic check)
  const openTags = content.match(/<(div|section|article|p|ul|ol|li|h[1-6])[^>]*>/g) || [];
  const closeTags = content.match(/<\/(div|section|article|p|ul|ol|li|h[1-6])>/g) || [];

  // Very rough balance check
  if (Math.abs(openTags.length - closeTags.length) > 5) {
    issues.push('Potential unclosed HTML tags');
    score -= 15;
  }

  // Check imports
  const hasImports = content.includes('import ');
  if (!hasImports) {
    issues.push('Missing imports');
    score -= 10;
  }

  // File exists and is readable
  if (!fs.existsSync(filePath)) {
    issues.push('File does not exist');
    score = 0;
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Extract wine names from article content
 * Looks for numbered picks like "1. Producer Wine Name"
 * Filters out FAQ questions and non-wine content
 */
function extractWineNamesFromArticle(content: string): string[] {
  const wineNames: string[] = [];

  // Pattern 1: <h3>N. Wine Name</h3> (numbered picks)
  const h3Pattern = /<h3[^>]*>[\d]+\.\s*([^<]+)<\/h3>/g;
  let match;
  while ((match = h3Pattern.exec(content)) !== null) {
    const name = match[1].trim();
    // Filter out FAQ questions and invalid wine names
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
 * Score wine validity - checks if recommended wines exist in catalog
 * Returns 100 if no wines (educational content is OK)
 * Returns 100 if all wines are valid
 * Returns 70 if some wines are valid
 * Returns 40 if no wines are valid
 */
async function scoreWineValidity(
  content: string,
  doValidate: boolean = false
): Promise<{
  score: number;
  issues: string[];
  validWines: number;
  invalidWines: string[];
}> {
  const issues: string[] = [];
  const wineNames = extractWineNamesFromArticle(content);

  // If no wines in article, that's OK (educational content)
  if (wineNames.length === 0) {
    return { score: 100, issues: [], validWines: 0, invalidWines: [] };
  }

  // If not doing async validation, return neutral score
  if (!doValidate) {
    return {
      score: 100, // Assume valid if not checking
      issues: [],
      validWines: wineNames.length,
      invalidWines: [],
    };
  }

  // Validate wines against catalog
  try {
    const validation = await validateWinesInCatalog(wineNames);
    const validCount = validation.valid.length;
    const invalidCount = validation.invalid.length;

    if (invalidCount === 0) {
      // All wines are valid
      return {
        score: 100,
        issues: [],
        validWines: validCount,
        invalidWines: [],
      };
    } else if (validCount > 0) {
      // Some wines are valid
      issues.push(`${invalidCount} wine(s) not found in catalog: ${validation.invalid.slice(0, 3).join(', ')}${invalidCount > 3 ? '...' : ''}`);
      return {
        score: 70,
        issues,
        validWines: validCount,
        invalidWines: validation.invalid,
      };
    } else {
      // No wines are valid
      issues.push(`All ${invalidCount} wines not found in catalog`);
      return {
        score: 40,
        issues,
        validWines: 0,
        invalidWines: validation.invalid,
      };
    }
  } catch (err: any) {
    issues.push(`Wine validation error: ${err.message}`);
    return {
      score: 80, // Give benefit of the doubt on error
      issues,
      validWines: 0,
      invalidWines: [],
    };
  }
}

/**
 * Calculate weighted total score
 * Weights adjust based on whether wine validation is enabled
 */
function calculateTotalScore(scores: QAScore['scores'], includeWineValidity: boolean = false): number {
  if (includeWineValidity) {
    // Weights when wine validation is enabled
    const weights = {
      wordCount: 0.20,
      structure: 0.20,
      seo: 0.20,
      contentQuality: 0.20,
      technicalValidity: 0.10,
      wineValidity: 0.10,
    };

    return Math.round(
      scores.wordCount * weights.wordCount +
      scores.structure * weights.structure +
      scores.seo * weights.seo +
      scores.contentQuality * weights.contentQuality +
      scores.technicalValidity * weights.technicalValidity +
      scores.wineValidity * weights.wineValidity
    );
  } else {
    // Original weights when wine validation is disabled
    const weights = {
      wordCount: 0.25,
      structure: 0.20,
      seo: 0.20,
      contentQuality: 0.25,
      technicalValidity: 0.10,
    };

    return Math.round(
      scores.wordCount * weights.wordCount +
      scores.structure * weights.structure +
      scores.seo * weights.seo +
      scores.contentQuality * weights.contentQuality +
      scores.technicalValidity * weights.technicalValidity
    );
  }
}

/**
 * Determine status based on score
 */
function determineStatus(totalScore: number): 'pass' | 'review' | 'fail' {
  if (totalScore >= PASS_THRESHOLD) return 'pass';
  if (totalScore >= FAIL_THRESHOLD) return 'review';
  return 'fail';
}

/**
 * Score a single article
 * @param filePath - Path to the article file
 * @param doWineValidation - Whether to validate wines against catalog (async)
 */
export async function scoreArticle(
  filePath: string,
  doWineValidation: boolean = false
): Promise<QAScore> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const slug = path.basename(filePath, '.astro');
  const category = path.basename(path.dirname(filePath));

  // Calculate word count
  const textContent = content
    .replace(/---[\s\S]*?---/, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = textContent.split(' ').filter(w => w.length > 0).length;
  const readTimeMinutes = Math.ceil(wordCount / 200);

  // Check for featured image
  const hasImage = content.includes('featuredImage');

  // Run all scoring functions
  const wordCountResult = scoreWordCount(wordCount);
  const structureResult = scoreStructure(content);
  const seoResult = scoreSEO(content);
  const contentResult = scoreContentQuality(content);
  const technicalResult = scoreTechnicalValidity(content, filePath);

  // Wine validation (async)
  const wineValidityResult = await scoreWineValidity(content, doWineValidation);

  // Aggregate scores
  const scores = {
    wordCount: wordCountResult.score,
    structure: structureResult.score,
    seo: seoResult.score,
    contentQuality: contentResult.score,
    technicalValidity: technicalResult.score,
    wineValidity: wineValidityResult.score,
  };

  const totalScore = calculateTotalScore(scores, doWineValidation);
  const status = determineStatus(totalScore);

  // Combine all issues
  const issues = [
    ...wordCountResult.issues,
    ...structureResult.issues,
    ...seoResult.issues,
    ...contentResult.issues,
    ...technicalResult.issues,
    ...wineValidityResult.issues,
  ];

  return {
    slug,
    category,
    filePath,
    scores,
    totalScore,
    status,
    issues,
    metrics: {
      wordCount,
      h2Count: structureResult.h2Count,
      wineCount: contentResult.wineCount,
      hasImage,
      hasSchema: seoResult.hasSchema,
      hasMeta: seoResult.hasMeta,
      readTimeMinutes,
      validWines: wineValidityResult.validWines,
      invalidWines: wineValidityResult.invalidWines.length > 0 ? wineValidityResult.invalidWines : undefined,
    },
  };
}

/**
 * Score all articles in a category or all categories
 * @param category - Optional category filter
 * @param doWineValidation - Whether to validate wines against catalog
 */
export async function scoreAllArticles(
  category?: string,
  doWineValidation: boolean = false
): Promise<QAScore[]> {
  const results: QAScore[] = [];
  const pagesDir = path.join(process.cwd(), 'src/pages');
  const categories = category ? [category] : ['learn', 'wine-pairings', 'buy'];

  for (const cat of categories) {
    const categoryDir = path.join(pagesDir, cat);
    if (!fs.existsSync(categoryDir)) continue;

    const files = fs.readdirSync(categoryDir);
    for (const file of files) {
      if (!file.endsWith('.astro') || file === 'index.astro' || file.startsWith('[')) {
        continue;
      }

      const filePath = path.join(categoryDir, file);
      try {
        const score = await scoreArticle(filePath, doWineValidation);
        results.push(score);
      } catch (err: any) {
        console.error(`Error scoring ${file}: ${err.message}`);
      }
    }
  }

  return results;
}

/**
 * Get summary statistics
 */
export function getScoreSummary(results: QAScore[]): {
  total: number;
  passed: number;
  review: number;
  failed: number;
  avgScore: number;
  commonIssues: { issue: string; count: number }[];
} {
  const passed = results.filter(r => r.status === 'pass').length;
  const review = results.filter(r => r.status === 'review').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const avgScore = Math.round(results.reduce((sum, r) => sum + r.totalScore, 0) / results.length);

  // Count common issues
  const issueCounts = new Map<string, number>();
  for (const result of results) {
    for (const issue of result.issues) {
      const baseIssue = issue.replace(/:\s*\d+.*$/, ''); // Remove specific numbers
      issueCounts.set(baseIssue, (issueCounts.get(baseIssue) || 0) + 1);
    }
  }

  const commonIssues = Array.from(issueCounts.entries())
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { total: results.length, passed, review, failed, avgScore, commonIssues };
}

// Main execution
async function main() {
  if (!specificArticle && !categoryFilter && !scoreAll) {
    console.log('Usage:');
    console.log('  npx tsx src/scripts/qa-score-article.ts --all');
    console.log('  npx tsx src/scripts/qa-score-article.ts --article=barolo-wine');
    console.log('  npx tsx src/scripts/qa-score-article.ts --category=learn');
    console.log('  npx tsx src/scripts/qa-score-article.ts --all --validate-wines');
    process.exit(0);
  }

  let results: QAScore[] = [];

  if (validateWines) {
    console.log('🍷 Wine validation enabled - checking wines against catalog...\n');
  }

  if (specificArticle) {
    // Find the article
    const pagesDir = path.join(process.cwd(), 'src/pages');
    for (const cat of ['learn', 'wine-pairings', 'buy']) {
      const filePath = path.join(pagesDir, cat, `${specificArticle}.astro`);
      if (fs.existsSync(filePath)) {
        results.push(await scoreArticle(filePath, validateWines));
        break;
      }
    }

    if (results.length === 0) {
      console.error(`Article not found: ${specificArticle}`);
      process.exit(1);
    }
  } else {
    results = await scoreAllArticles(categoryFilter || undefined, validateWines);
  }

  if (outputJson) {
    console.log(JSON.stringify({ results, summary: getScoreSummary(results) }, null, 2));
    return;
  }

  // Pretty print results
  console.log('\n📊 ARTICLE QA SCORES\n');
  console.log('═'.repeat(80));

  // Sort by score (lowest first to highlight problems)
  results.sort((a, b) => a.totalScore - b.totalScore);

  for (const result of results) {
    const statusIcon = result.status === 'pass' ? '✅' : result.status === 'review' ? '⚠️' : '❌';
    const scoreBar = '█'.repeat(Math.floor(result.totalScore / 10)) + '░'.repeat(10 - Math.floor(result.totalScore / 10));

    console.log(`\n${statusIcon} ${result.category}/${result.slug}`);
    console.log(`   Score: [${scoreBar}] ${result.totalScore}%`);
    console.log(`   Words: ${result.metrics.wordCount} | H2s: ${result.metrics.h2Count} | Wines: ${result.metrics.wineCount}`);

    if (result.issues.length > 0) {
      console.log(`   Issues:`);
      for (const issue of result.issues.slice(0, 5)) {
        console.log(`      • ${issue}`);
      }
      if (result.issues.length > 5) {
        console.log(`      ... and ${result.issues.length - 5} more`);
      }
    }
  }

  // Summary
  const summary = getScoreSummary(results);

  console.log('\n' + '═'.repeat(80));
  console.log('\n📋 SUMMARY\n');
  console.log(`   Total Articles: ${summary.total}`);
  console.log(`   ✅ Passed (${PASS_THRESHOLD}%+): ${summary.passed}`);
  console.log(`   ⚠️  Review (${FAIL_THRESHOLD}-${PASS_THRESHOLD}%): ${summary.review}`);
  console.log(`   ❌ Failed (<${FAIL_THRESHOLD}%): ${summary.failed}`);
  console.log(`   📊 Average Score: ${summary.avgScore}%`);

  if (summary.commonIssues.length > 0) {
    console.log('\n🔧 COMMON ISSUES:\n');
    for (const { issue, count } of summary.commonIssues.slice(0, 5)) {
      console.log(`   ${count}x ${issue}`);
    }
  }
}

// Only run main if this is the entry point
const isMainModule = process.argv[1]?.includes('qa-score-article');
if (isMainModule) {
  main().catch(console.error);
}
