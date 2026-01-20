/**
 * Article Enrichment Script
 *
 * Reads existing thin articles and uses AI to generate substantial,
 * SEO-rich content to expand them from ~500 words to ~2000+ words.
 *
 * Usage:
 *   npx tsx src/scripts/enrich-articles.ts [options]
 *
 * Options:
 *   --dry-run         Preview changes without writing files
 *   --limit=N         Process only N articles (default: 5)
 *   --category=X      Only process articles in category (learn|wine-pairings|buy)
 *   --article=slug    Process a specific article by slug
 *   --priority=N      Only process articles with keyword priority >= N
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import {
  getSystemPrompt,
  getContentType,
  getHistoryPrompt,
  getTerroirPrompt,
  getTastingProfilePrompt,
  getFoodPairingPrompt,
  getBuyingGuidePrompt,
  getComparisonPrompt,
  getFAQPrompt,
  getExpertTipsPrompt,
  getExtendedRecommendationsPrompt,
  getAgingPrompt,
  estimateWordAddition,
  type ArticleContext,
} from '../lib/content-enrichment-templates.js';

config({ path: '.env.local', override: true });

// Initialize clients
const anthropicKey = process.env.ANTHROPIC_API_KEY;
if (!anthropicKey) {
  console.error('❌ Missing ANTHROPIC_API_KEY in .env.local');
  console.log('\nTo use this script, add your Anthropic API key:');
  console.log('  echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env.local\n');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: anthropicKey });

// Optional Supabase for priority lookup
let supabase: any = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 5;
const categoryArg = args.find(a => a.startsWith('--category='));
const categoryFilter = categoryArg ? categoryArg.split('=')[1] : null;
const articleArg = args.find(a => a.startsWith('--article='));
const specificArticle = articleArg ? articleArg.split('=')[1] : null;
const priorityArg = args.find(a => a.startsWith('--priority='));
const minPriority = priorityArg ? parseInt(priorityArg.split('=')[1]) : 0;

interface ArticleInfo {
  slug: string;
  category: 'learn' | 'wine-pairings' | 'buy';
  filePath: string;
  keyword: string;
  title: string;
  wordCount: number;
  priority?: number;
  existingWines: string[];
}

/**
 * Scan and collect all articles
 */
function collectArticles(): ArticleInfo[] {
  const articles: ArticleInfo[] = [];
  const pagesDir = path.join(process.cwd(), 'src/pages');
  const categories = ['learn', 'wine-pairings', 'buy'] as const;

  for (const category of categories) {
    if (categoryFilter && category !== categoryFilter) continue;

    const categoryDir = path.join(pagesDir, category);
    if (!fs.existsSync(categoryDir)) continue;

    const files = fs.readdirSync(categoryDir);
    for (const file of files) {
      if (!file.endsWith('.astro') || file === 'index.astro') continue;
      if (file.startsWith('[')) continue; // Skip dynamic routes

      const slug = file.replace('.astro', '');
      if (specificArticle && slug !== specificArticle) continue;

      const filePath = path.join(categoryDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract metadata
      const titleMatch = content.match(/title:\s*["']([^"']+)["']/);
      const title = titleMatch ? titleMatch[1] : slug;

      // Extract keyword from title or slug
      const keyword = title
        .replace(/ - Expert Guide$/, '')
        .replace(/ - Complete Guide.*$/, '')
        .replace(/ Guide$/, '')
        .toLowerCase();

      // Count words (rough estimate)
      const textContent = content
        .replace(/---[\s\S]*?---/, '') // Remove frontmatter
        .replace(/<[^>]+>/g, ' ')       // Remove HTML tags
        .replace(/\s+/g, ' ');
      const wordCount = textContent.split(' ').filter(w => w.length > 0).length;

      // Extract existing wine names to avoid duplicates
      const wineMatches = content.matchAll(/<h3[^>]*>[\d]+\.\s*([^<]+)<\/h3>/g);
      const existingWines = Array.from(wineMatches).map(m => m[1].trim());

      articles.push({
        slug,
        category,
        filePath,
        keyword,
        title,
        wordCount,
        existingWines,
      });
    }
  }

  return articles;
}

/**
 * Get keyword priorities from Supabase
 */
async function enrichWithPriorities(articles: ArticleInfo[]): Promise<ArticleInfo[]> {
  if (!supabase) return articles;

  try {
    const { data: keywords } = await supabase
      .from('keyword_opportunities')
      .select('keyword, priority, search_volume')
      .in('keyword', articles.map(a => a.keyword));

    if (keywords) {
      const priorityMap = new Map(keywords.map((k: any) => [k.keyword.toLowerCase(), k.priority]));
      for (const article of articles) {
        article.priority = priorityMap.get(article.keyword.toLowerCase()) || 5;
      }
    }
  } catch (err) {
    console.log('⚠️  Could not fetch keyword priorities from Supabase');
  }

  return articles;
}

/**
 * Generate enrichment content using Claude
 */
async function generateEnrichmentContent(context: ArticleContext): Promise<Map<string, string>> {
  const contentType = getContentType(context.keyword);
  const sections = new Map<string, string>();

  console.log(`   📝 Generating content (type: ${contentType})...`);

  // Determine which sections to generate based on content type
  const prompts: { name: string; prompt: string }[] = [];

  // Always generate topic-specific expert tips and FAQs
  prompts.push({ name: 'expertTips', prompt: getExpertTipsPrompt(context) });
  prompts.push({ name: 'faqs', prompt: getFAQPrompt(context) });

  // Content-type specific sections
  if (contentType === 'region' || contentType === 'varietal') {
    prompts.push({ name: 'history', prompt: getHistoryPrompt(context) });
    prompts.push({ name: 'terroir', prompt: getTerroirPrompt(context) });
    prompts.push({ name: 'tastingProfile', prompt: getTastingProfilePrompt(context) });
    prompts.push({ name: 'foodPairing', prompt: getFoodPairingPrompt(context) });
    prompts.push({ name: 'aging', prompt: getAgingPrompt(context) });
    prompts.push({ name: 'moreRecommendations', prompt: getExtendedRecommendationsPrompt(context) });
  }

  if (contentType === 'pairing') {
    prompts.push({ name: 'foodPairing', prompt: getFoodPairingPrompt(context) });
    prompts.push({ name: 'moreRecommendations', prompt: getExtendedRecommendationsPrompt(context) });
  }

  if (contentType === 'comparison') {
    prompts.push({ name: 'comparison', prompt: getComparisonPrompt(context) });
    prompts.push({ name: 'foodPairing', prompt: getFoodPairingPrompt(context) });
  }

  if (contentType === 'buying') {
    prompts.push({ name: 'buyingGuide', prompt: getBuyingGuidePrompt(context) });
    prompts.push({ name: 'moreRecommendations', prompt: getExtendedRecommendationsPrompt(context) });
    prompts.push({ name: 'aging', prompt: getAgingPrompt(context) });
  }

  // Generate each section
  for (const { name, prompt } of prompts) {
    if (!prompt) continue;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: getSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      sections.set(name, text);

      // Rate limiting pause
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err: any) {
      console.error(`   ⚠️  Failed to generate ${name}: ${err.message}`);
    }
  }

  return sections;
}

/**
 * Insert enrichment content into article
 */
function enrichArticle(content: string, sections: Map<string, string>, keyword: string): string {
  let enrichedContent = content;

  // Find insertion points and add new sections

  // 1. Add history/terroir after the intro paragraph (after first </p> following Understanding heading)
  const historyContent = sections.get('history') || '';
  const terroirContent = sections.get('terroir') || '';
  const tastingContent = sections.get('tastingProfile') || '';

  if (historyContent || terroirContent || tastingContent) {
    const earlyContent = [historyContent, terroirContent, tastingContent].filter(c => c).join('\n\n');

    // Insert after the Understanding section's paragraph
    const understandingMatch = enrichedContent.match(/(<h2>Understanding[^<]*<\/h2>\s*<p>[^<]*<\/p>)/);
    if (understandingMatch) {
      enrichedContent = enrichedContent.replace(
        understandingMatch[0],
        understandingMatch[0] + '\n\n' + earlyContent
      );
    }
  }

  // 2. Add food pairing section before "Our Top Picks"
  const foodPairingContent = sections.get('foodPairing') || '';
  if (foodPairingContent) {
    enrichedContent = enrichedContent.replace(
      '<h2>Our Top Picks</h2>',
      foodPairingContent + '\n\n<h2>Our Top Picks</h2>'
    );
  }

  // 3. Add more recommendations after existing wine cards (before Expert Tips)
  const moreRecsContent = sections.get('moreRecommendations') || '';
  if (moreRecsContent) {
    enrichedContent = enrichedContent.replace(
      '<h2>Expert Tips</h2>',
      '\n<h2>More Excellent Options</h2>\n' + moreRecsContent + '\n\n<h2>Expert Tips</h2>'
    );
  }

  // 4. Replace generic expert tips with topic-specific ones
  const expertTipsContent = sections.get('expertTips') || '';
  if (expertTipsContent) {
    const tipsRegex = /<h2>Expert Tips<\/h2>\s*<ol[^>]*>[\s\S]*?<\/ol>/;
    if (tipsRegex.test(enrichedContent)) {
      enrichedContent = enrichedContent.replace(
        tipsRegex,
        '<h2>Expert Tips</h2>\n' + expertTipsContent
      );
    }
  }

  // 5. Replace generic FAQs with topic-specific ones
  const faqContent = sections.get('faqs') || '';
  if (faqContent) {
    const faqRegex = /<h2>Frequently Asked Questions<\/h2>\s*<div class="space-y-6">[\s\S]*?<\/div>\s*(?=<!--|\s*<div class="mt-12)/;
    if (faqRegex.test(enrichedContent)) {
      enrichedContent = enrichedContent.replace(
        faqRegex,
        '<h2>Frequently Asked Questions</h2>\n' + faqContent + '\n\n'
      );
    }
  }

  // 6. Add aging section before FAQs
  const agingContent = sections.get('aging') || '';
  if (agingContent) {
    enrichedContent = enrichedContent.replace(
      '<h2>Frequently Asked Questions</h2>',
      agingContent + '\n\n<h2>Frequently Asked Questions</h2>'
    );
  }

  // 7. Add buying guide before aging/FAQs
  const buyingGuideContent = sections.get('buyingGuide') || '';
  if (buyingGuideContent) {
    const insertBefore = agingContent
      ? /<h2>Aging/
      : /<h2>Frequently Asked Questions/;
    enrichedContent = enrichedContent.replace(
      insertBefore,
      buyingGuideContent + '\n\n$&'
    );
  }

  // 8. Add comparison section for vs articles
  const comparisonContent = sections.get('comparison') || '';
  if (comparisonContent) {
    enrichedContent = enrichedContent.replace(
      '<h2>Our Top Picks</h2>',
      comparisonContent + '\n\n<h2>Our Top Picks</h2>'
    );
  }

  // Update the readTime based on new content length
  const newWordCount = enrichedContent
    .replace(/---[\s\S]*?---/, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(w => w.length > 0).length;

  const readMinutes = Math.ceil(newWordCount / 200);
  enrichedContent = enrichedContent.replace(
    /readTime:\s*["']\d+ min["']/,
    `readTime: "${readMinutes} min"`
  );

  // Update description to remove duplicate words
  enrichedContent = enrichedContent.replace(
    /description:\s*["']Discover the best best /g,
    'description: "Discover the best '
  );

  return enrichedContent;
}

/**
 * Main enrichment process
 */
async function main() {
  console.log('🍷 Article Enrichment System\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no files will be modified)' : 'LIVE'}`);
  console.log(`Limit: ${limit} articles\n`);

  // Collect articles
  let articles = collectArticles();
  console.log(`📄 Found ${articles.length} articles total\n`);

  // Enrich with priorities
  articles = await enrichWithPriorities(articles);

  // Filter by priority if specified
  if (minPriority > 0) {
    articles = articles.filter(a => (a.priority || 0) >= minPriority);
    console.log(`🎯 ${articles.length} articles with priority >= ${minPriority}\n`);
  }

  // Sort by priority (highest first), then by word count (shortest first - most need enrichment)
  articles.sort((a, b) => {
    const priorityDiff = (b.priority || 5) - (a.priority || 5);
    if (priorityDiff !== 0) return priorityDiff;
    return a.wordCount - b.wordCount;
  });

  // Apply limit
  const toProcess = articles.slice(0, limit);

  console.log('📋 Articles to enrich:\n');
  for (const article of toProcess) {
    const estimate = estimateWordAddition(article.keyword);
    console.log(`   ${article.category}/${article.slug}`);
    console.log(`      Current: ~${article.wordCount} words | Target: ~${article.wordCount + estimate} words`);
    console.log(`      Priority: ${article.priority || 'N/A'}\n`);
  }

  if (isDryRun) {
    console.log('\n✅ Dry run complete. No files were modified.');
    console.log('   Run without --dry-run to apply changes.\n');
    return;
  }

  // Process articles
  let processed = 0;
  let failed = 0;

  for (const article of toProcess) {
    console.log(`\n🔄 Processing: ${article.category}/${article.slug}`);

    try {
      const context: ArticleContext = {
        keyword: article.keyword,
        title: article.title,
        category: article.category,
        existingWines: article.existingWines,
      };

      // Generate enrichment content
      const sections = await generateEnrichmentContent(context);

      if (sections.size === 0) {
        console.log('   ⚠️  No content generated, skipping');
        failed++;
        continue;
      }

      console.log(`   ✅ Generated ${sections.size} sections`);

      // Read current content
      const currentContent = fs.readFileSync(article.filePath, 'utf-8');

      // Enrich the article
      const enrichedContent = enrichArticle(currentContent, sections, article.keyword);

      // Calculate new word count
      const newWordCount = enrichedContent
        .replace(/---[\s\S]*?---/, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .split(' ')
        .filter(w => w.length > 0).length;

      // Write enriched content
      fs.writeFileSync(article.filePath, enrichedContent);

      console.log(`   📝 Enriched: ${article.wordCount} → ${newWordCount} words (+${newWordCount - article.wordCount})`);
      processed++;

      // Rate limiting between articles
      console.log('   ⏳ Waiting 5s before next article...');
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (err: any) {
      console.error(`   ❌ Failed: ${err.message}`);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📋 ENRICHMENT SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Enriched: ${processed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${toProcess.length}`);
}

main()
  .then(() => {
    console.log('\n✅ Enrichment complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
