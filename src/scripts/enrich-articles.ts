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
 *   --thin-only       Only process articles under 1500 words (newly created/thin)
 *   --max-words=N     Only process articles under N words (default: unlimited)
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
  getAgingPrompt,
  estimateWordAddition,
  type ArticleContext,
} from '../lib/content-enrichment-templates.js';
import {
  getAdditionalWinesForArticle,
  type WineRecommendation,
} from '../lib/wine-catalog.js';

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
const thinOnly = args.includes('--thin-only');
const maxWordsArg = args.find(a => a.startsWith('--max-words='));
const maxWords = maxWordsArg ? parseInt(maxWordsArg.split('=')[1]) : (thinOnly ? 1500 : Infinity);
const skipWineSection = args.includes('--skip-wine-section');

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
 * Generate wine recommendation HTML cards from real catalog wines
 */
function generateWineRecommendationCards(wines: WineRecommendation[]): string {
  if (wines.length === 0) {
    return '';
  }

  const cards = wines.map(wine => {
    const priceEstimate = wine.wine_type === 'sparkling' ? '$40-80' :
                         wine.variety?.toLowerCase().includes('pinot noir') ? '$30-60' :
                         wine.variety?.toLowerCase().includes('cabernet') ? '$35-75' :
                         '$25-50';

    return `  <div class="bg-gray-50 rounded-lg p-5 border border-gray-100">
    <h3 class="text-lg font-semibold text-wine-700 mb-1">${wine.name}</h3>
    <p class="text-sm text-gray-600 mb-2">${wine.region} | ~${priceEstimate}</p>
    <p class="text-gray-700 text-sm">${wine.notes}</p>
    <p class="text-xs text-wine-600 mt-2"><strong>Variety:</strong> ${wine.variety || wine.wine_type}</p>
  </div>`;
  }).join('\n');

  return `<div class="grid md:grid-cols-2 gap-4 my-6">\n${cards}\n</div>`;
}

/**
 * Generate enrichment content using Claude
 * Now uses REAL wines from catalog instead of AI-generated recommendations
 */
async function generateEnrichmentContent(
  context: ArticleContext,
  useRealWines: boolean = true
): Promise<Map<string, string>> {
  const contentType = getContentType(context.keyword);
  const sections = new Map<string, string>();

  console.log(`   📝 Generating content (type: ${contentType})...`);

  // Determine which sections to generate based on content type
  const prompts: { name: string; prompt: string }[] = [];

  // Always generate topic-specific expert tips and FAQs
  prompts.push({ name: 'expertTips', prompt: getExpertTipsPrompt(context) });
  prompts.push({ name: 'faqs', prompt: getFAQPrompt(context) });

  // Content-type specific sections (NO AI wine recommendations)
  if (contentType === 'region' || contentType === 'varietal') {
    prompts.push({ name: 'history', prompt: getHistoryPrompt(context) });
    prompts.push({ name: 'terroir', prompt: getTerroirPrompt(context) });
    prompts.push({ name: 'tastingProfile', prompt: getTastingProfilePrompt(context) });
    prompts.push({ name: 'foodPairing', prompt: getFoodPairingPrompt(context) });
    prompts.push({ name: 'aging', prompt: getAgingPrompt(context) });
  }

  if (contentType === 'pairing') {
    prompts.push({ name: 'foodPairing', prompt: getFoodPairingPrompt(context) });
  }

  if (contentType === 'comparison') {
    prompts.push({ name: 'comparison', prompt: getComparisonPrompt(context) });
    prompts.push({ name: 'foodPairing', prompt: getFoodPairingPrompt(context) });
  }

  if (contentType === 'buying') {
    prompts.push({ name: 'buyingGuide', prompt: getBuyingGuidePrompt(context) });
    prompts.push({ name: 'aging', prompt: getAgingPrompt(context) });
  }

  // Generate AI content sections (NOT wine recommendations)
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

  // Generate wine recommendations from REAL catalog data (not AI)
  // Only add if we should include wine section and content type supports it
  if (useRealWines && !skipWineSection) {
    const needsWineRecs = ['region', 'varietal', 'pairing', 'buying'].includes(contentType);

    if (needsWineRecs) {
      try {
        console.log(`   🍷 Fetching real wines from catalog...`);
        const wines = await getAdditionalWinesForArticle(
          context.keyword,
          context.existingWines || [],
          6 // Get 6 wines for enrichment
        );

        if (wines.length >= 3) {
          const wineCardsHtml = generateWineRecommendationCards(wines);
          sections.set('moreRecommendations', wineCardsHtml);
          console.log(`   ✅ Found ${wines.length} matching wines in catalog`);
        } else {
          console.log(`   ⚠️  Only ${wines.length} wines found - skipping wine section (need 3+)`);
        }
      } catch (err: any) {
        console.error(`   ⚠️  Failed to fetch wines from catalog: ${err.message}`);
        console.log(`   ⚠️  Skipping wine recommendations section`);
      }
    }
  }

  return sections;
}

/**
 * Insert enrichment content into article
 * Handles multiple article structures:
 * - Standard articles with "Understanding", "Our Top Picks", "Expert Tips", "FAQs"
 * - Pairing articles with "Why X Works Best", "Top 3 Wine Styles", "Pairing Tips"
 * - Natural wine articles with different heading patterns
 */
function enrichArticle(content: string, sections: Map<string, string>, keyword: string): string {
  let enrichedContent = content;
  let contentInserted = false;

  // Find insertion points and add new sections

  // 1. Add history/terroir after the intro paragraph
  const historyContent = sections.get('history') || '';
  const terroirContent = sections.get('terroir') || '';
  const tastingContent = sections.get('tastingProfile') || '';

  if (historyContent || terroirContent || tastingContent) {
    const earlyContent = [historyContent, terroirContent, tastingContent].filter(c => c).join('\n\n');

    // Try multiple patterns for inserting early content
    const earlyInsertPatterns = [
      // Standard: after "Understanding" section
      /(<h2>Understanding[^<]*<\/h2>\s*<p>[^<]*<\/p>)/,
      // Pairing: after "Why X Works Best" section
      /(<h2>Why [^<]*Works Best[^<]*<\/h2>\s*<p>[\s\S]*?<\/p>)/,
      // Generic: after the first <h2>...</h2> and its following paragraph
      /(<h2>[^<]+<\/h2>\s*<p>[\s\S]*?<\/p>)/,
    ];

    for (const pattern of earlyInsertPatterns) {
      const match = enrichedContent.match(pattern);
      if (match) {
        enrichedContent = enrichedContent.replace(
          match[0],
          match[0] + '\n\n' + earlyContent
        );
        contentInserted = true;
        break;
      }
    }
  }

  // 2. Add food pairing section before main content
  const foodPairingContent = sections.get('foodPairing') || '';
  if (foodPairingContent) {
    // Try multiple insertion points
    const foodPairingPatterns = [
      '<h2>Our Top Picks</h2>',
      /<h2>Top \d+ Wine Styles/,
      '<h2>Expert Recommendations</h2>',
      '<h2>Tasting Notes',
    ];

    let inserted = false;
    for (const pattern of foodPairingPatterns) {
      if (typeof pattern === 'string' ? enrichedContent.includes(pattern) : pattern.test(enrichedContent)) {
        enrichedContent = enrichedContent.replace(
          pattern,
          foodPairingContent + '\n\n' + (typeof pattern === 'string' ? pattern : pattern.source.replace(/\\/g, ''))
        );
        inserted = true;
        contentInserted = true;
        break;
      }
    }
  }

  // 3. Add more recommendations before expert tips or near the end
  const moreRecsContent = sections.get('moreRecommendations') || '';
  if (moreRecsContent) {
    const moreRecsPatterns = [
      '<h2>Expert Tips</h2>',
      '<h2>Pairing Tips',
      '<h2>Serving Tips</h2>',
      /<h2>Wines to Avoid/,
      /<!-- Related Articles/,
      /<!-- Author Bio/,
    ];

    let inserted = false;
    for (const pattern of moreRecsPatterns) {
      const patternStr = typeof pattern === 'string' ? pattern : pattern.source;
      if (typeof pattern === 'string' ? enrichedContent.includes(pattern) : pattern.test(enrichedContent)) {
        enrichedContent = enrichedContent.replace(
          pattern,
          '\n<h2>More Excellent Options</h2>\n' + moreRecsContent + '\n\n' + (typeof pattern === 'string' ? pattern : '')
        );
        inserted = true;
        contentInserted = true;
        break;
      }
    }
  }

  // 4. Replace or add expert tips
  const expertTipsContent = sections.get('expertTips') || '';
  if (expertTipsContent) {
    // Try to replace existing expert tips
    const tipsPatterns = [
      /<h2>Expert Tips<\/h2>\s*<ol[^>]*>[\s\S]*?<\/ol>/,
      /<h2>Pairing Tips from Our Sommeliers<\/h2>[\s\S]*?(?=<h2>|<!-- |<\/ArticleLayout>)/,
    ];

    let replaced = false;
    for (const pattern of tipsPatterns) {
      if (pattern.test(enrichedContent)) {
        enrichedContent = enrichedContent.replace(
          pattern,
          '<h2>Expert Tips</h2>\n' + expertTipsContent + '\n\n'
        );
        replaced = true;
        contentInserted = true;
        break;
      }
    }

    // If no existing tips section, add before end of article
    if (!replaced) {
      const insertBeforeEnd = [
        /<!-- Related Articles/,
        /<!-- Author Bio/,
        /<div class="mt-10 pt-8 border-t/,
        /<div class="mt-12 p-6 bg-gray-50/,
      ];

      for (const pattern of insertBeforeEnd) {
        if (pattern.test(enrichedContent)) {
          enrichedContent = enrichedContent.replace(
            pattern,
            '<h2>Expert Tips</h2>\n' + expertTipsContent + '\n\n$&'
          );
          contentInserted = true;
          break;
        }
      }
    }
  }

  // 5. Replace or add FAQs
  const faqContent = sections.get('faqs') || '';
  if (faqContent) {
    const faqRegex = /<h2>Frequently Asked Questions<\/h2>\s*<div class="space-y-6">[\s\S]*?<\/div>\s*(?=<!--|\s*<div class="mt-12)/;
    if (faqRegex.test(enrichedContent)) {
      enrichedContent = enrichedContent.replace(
        faqRegex,
        '<h2>Frequently Asked Questions</h2>\n' + faqContent + '\n\n'
      );
      contentInserted = true;
    } else {
      // Add FAQs before end sections
      const insertBeforeEnd = [
        /<!-- Related Articles/,
        /<!-- Author Bio/,
        /<div class="mt-10 pt-8 border-t/,
        /<div class="mt-12 p-6 bg-gray-50/,
      ];

      for (const pattern of insertBeforeEnd) {
        if (pattern.test(enrichedContent)) {
          enrichedContent = enrichedContent.replace(
            pattern,
            '<h2>Frequently Asked Questions</h2>\n' + faqContent + '\n\n$&'
          );
          contentInserted = true;
          break;
        }
      }
    }
  }

  // 6. Add aging section before FAQs
  const agingContent = sections.get('aging') || '';
  if (agingContent) {
    if (enrichedContent.includes('<h2>Frequently Asked Questions</h2>')) {
      enrichedContent = enrichedContent.replace(
        '<h2>Frequently Asked Questions</h2>',
        agingContent + '\n\n<h2>Frequently Asked Questions</h2>'
      );
      contentInserted = true;
    }
  }

  // 7. Add buying guide before aging/FAQs
  const buyingGuideContent = sections.get('buyingGuide') || '';
  if (buyingGuideContent) {
    const insertPatterns = [
      /<h2>Aging/,
      /<h2>Frequently Asked Questions/,
      /<!-- Related Articles/,
      /<!-- Author Bio/,
      /<div class="mt-10 pt-8 border-t/,
    ];

    for (const pattern of insertPatterns) {
      if (pattern.test(enrichedContent)) {
        enrichedContent = enrichedContent.replace(
          pattern,
          buyingGuideContent + '\n\n$&'
        );
        contentInserted = true;
        break;
      }
    }
  }

  // 8. Add comparison section for vs articles
  const comparisonContent = sections.get('comparison') || '';
  if (comparisonContent) {
    const comparisonPatterns = [
      '<h2>Our Top Picks</h2>',
      /<h2>Top \d+ Wine/,
      '<h2>Expert Tips</h2>',
    ];

    for (const pattern of comparisonPatterns) {
      if (typeof pattern === 'string' ? enrichedContent.includes(pattern) : pattern.test(enrichedContent)) {
        enrichedContent = enrichedContent.replace(
          pattern,
          comparisonContent + '\n\n' + (typeof pattern === 'string' ? pattern : '')
        );
        contentInserted = true;
        break;
      }
    }
  }

  // 9. FALLBACK: If no content was inserted, append all sections before </ArticleLayout>
  if (!contentInserted && sections.size > 0) {
    const allContent: string[] = [];

    if (historyContent) allContent.push(historyContent);
    if (terroirContent) allContent.push(terroirContent);
    if (tastingContent) allContent.push(tastingContent);
    if (foodPairingContent) allContent.push(foodPairingContent);
    if (moreRecsContent) allContent.push('<h2>More Excellent Options</h2>\n' + moreRecsContent);
    if (sections.get('buyingGuide')) allContent.push(sections.get('buyingGuide')!);
    if (agingContent) allContent.push(agingContent);
    if (expertTipsContent) allContent.push('<h2>Expert Tips</h2>\n' + expertTipsContent);
    if (faqContent) allContent.push('<h2>Frequently Asked Questions</h2>\n' + faqContent);
    if (comparisonContent) allContent.push(comparisonContent);

    if (allContent.length > 0) {
      const combinedContent = allContent.join('\n\n');
      // Insert before </ArticleLayout>
      enrichedContent = enrichedContent.replace(
        '</ArticleLayout>',
        '\n' + combinedContent + '\n\n</ArticleLayout>'
      );
    }
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
  console.log(`Limit: ${limit} articles`);
  if (thinOnly || maxWords < Infinity) {
    console.log(`📏 Only processing articles under ${maxWords} words`);
  }
  console.log('');

  // Collect articles
  let articles = collectArticles();
  console.log(`📄 Found ${articles.length} articles total\n`);

  // Enrich with priorities
  articles = await enrichWithPriorities(articles);

  // Filter by max word count (thin articles only)
  if (maxWords < Infinity) {
    const beforeFilter = articles.length;
    articles = articles.filter(a => a.wordCount < maxWords);
    console.log(`📏 ${articles.length} thin articles under ${maxWords} words (filtered ${beforeFilter - articles.length})\n`);
  }

  // Filter by priority if specified
  if (minPriority > 0) {
    articles = articles.filter(a => (a.priority || 0) >= minPriority);
    console.log(`🎯 ${articles.length} articles with priority >= ${minPriority}\n`);
  }

  // Sort by word count (shortest first - most need enrichment), then by priority
  articles.sort((a, b) => {
    // Shortest articles first (need most enrichment)
    const wordDiff = a.wordCount - b.wordCount;
    if (wordDiff !== 0) return wordDiff;
    // Then by priority (highest first)
    return (b.priority || 5) - (a.priority || 5);
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
