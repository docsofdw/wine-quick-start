/**
 * Generate Articles for Top Priority Keywords
 * Enhanced with:
 * - Intelligent image generation with SEO alt text
 * - Dynamic meta descriptions based on intent
 * - Multiple schema types (Article, FAQ, HowTo, Breadcrumb)
 * - Better content structure for featured snippets
 *
 * Usage:
 *   npx tsx src/scripts/generate-priority-articles.ts [options]
 *
 * Options:
 *   --limit=N       Generate N articles (default: 10)
 *   --dry-run       Preview without writing files
 *   --min-priority=N  Only keywords with priority >= N (default: 8)
 *   --keyword="..." Generate exactly one keyword
 *   --no-mark-used  Do not update keyword status (for orchestrators)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config({ path: '.env.local', override: true });

// Import enhanced utilities
const { getWinesForKeyword, getRandomWines, getWinesByType, getWinesByRegion } = await import('../lib/wine-catalog.js');
import { getRandomAuthor, getAuthorSchema } from '../data/authors.js';
import {
  generateArticleImage,
  generateAltText,
  generateCaption,
  generateImagePrompt,
} from '../lib/image-generation.js';
import {
  generateMetaDescription,
  generateSEOTitle,
  generateCanonicalUrl,
  generateCombinedSchema,
  determineIntent,
  type FAQItem,
  type HowToStep,
} from '../lib/seo-utils.js';
import {
  deriveClusterKey,
  determineIntentClass,
  determinePageRole,
  suggestLinksForArticle,
} from '../lib/content-graph.js';

// Parse CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;
const priorityArg = args.find(a => a.startsWith('--min-priority='));
const minPriority = priorityArg ? parseInt(priorityArg.split('=')[1]) : 8;
const keywordArg = args.find(a => a.startsWith('--keyword='));
const specificKeyword = keywordArg ? keywordArg.split('=').slice(1).join('=').trim() : null;
const noMarkUsed = args.includes('--no-mark-used');

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey);

// Replicate token for images
const replicateToken = process.env.REPLICATE_API_TOKEN;
if (replicateToken) {
  console.log('🎨 Image generation enabled (Replicate)\n');
} else {
  console.log('⚠️  REPLICATE_API_TOKEN not set - images will not be generated\n');
}

// ============================================================================
// Duplicate Detection
// ============================================================================

function normalizeToCoreTopic(text: string): string {
  return text
    .toLowerCase()
    .replace(/\.(astro|mdx)$/, '')
    .replace(/^(best-|top-|ultimate-|complete-|expert-)/g, '')
    .replace(/(-guide|-recommendations|-basics|-explained|-101|-tips)$/g, '')
    .replace(/^(wine-with-|best-wine-with-|what-wine-goes-with-|what-to-eat-with-)/, 'pairing-')
    .replace(/(-wine-pairing|-food-pairing|-pairing)$/, '')
    .replace(/^([a-z-]+)-food-pairing$/, 'pairing-$1')
    .replace(/^([a-z-]+)-wine-guide$/, '$1-wine')
    .replace(/^([a-z-]+)-wine$/, '$1')
    .replace(/(\b\w+\b)(?=.*\b\1\b)/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
}

function getExistingPages(): { slugs: Set<string>; topics: Set<string> } {
  const pagesDir = path.join(process.cwd(), 'src/pages');
  const existingSlugs = new Set<string>();
  const existingTopics = new Set<string>();

  const scanDir = (dir: string, prefix: string = '') => {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('[')) {
        scanDir(filePath, prefix + file + '/');
      } else if (file.endsWith('.astro') || file.endsWith('.mdx')) {
        const slug = file.replace(/\.(astro|mdx)$/, '');
        if (slug !== 'index') {
          existingSlugs.add(slug);
          existingSlugs.add(prefix + slug);
          const topic = normalizeToCoreTopic(slug);
          existingTopics.add(topic);
        }
      }
    }
  };

  scanDir(path.join(pagesDir, 'learn'));
  scanDir(path.join(pagesDir, 'wine-pairings'));
  scanDir(path.join(pagesDir, 'buy'));

  return { slugs: existingSlugs, topics: existingTopics };
}

function keywordToSlug(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isDuplicateTopic(keyword: string, existingTopics: Set<string>): boolean {
  const newTopic = normalizeToCoreTopic(keywordToSlug(keyword));
  return existingTopics.has(newTopic);
}

// ============================================================================
// Category Detection
// ============================================================================

function determineCategory(keyword: string): 'learn' | 'wine-pairings' | 'buy' {
  const lowerKw = keyword.toLowerCase();

  if (lowerKw.includes('pairing') || lowerKw.includes('with ') || lowerKw.includes('food')) {
    return 'wine-pairings';
  }
  if (lowerKw.includes('buy') || lowerKw.includes('price') || lowerKw.includes('for sale') ||
      lowerKw.includes('under $') || lowerKw.includes('under 20') || lowerKw.includes('under 50') ||
      lowerKw.includes('cheap') || lowerKw.includes('affordable') || lowerKw.includes('budget')) {
    return 'buy';
  }
  return 'learn';
}

function inferFallbackWineType(keyword: string): string | null {
  const lowerKw = keyword.toLowerCase();

  if (lowerKw.includes('sparkling') || lowerKw.includes('champagne') || lowerKw.includes('prosecco') || lowerKw.includes('cava')) return 'sparkling';
  if (lowerKw.includes('rose') || lowerKw.includes('rosé')) return 'rosé';
  if (lowerKw.includes('white') || lowerKw.includes('chardonnay') || lowerKw.includes('sauvignon blanc') || lowerKw.includes('riesling') || lowerKw.includes('pinot grigio')) return 'white';
  if (lowerKw.includes('orange')) return 'orange';
  if (lowerKw.includes('dessert') || lowerKw.includes('port') || lowerKw.includes('sherry') || lowerKw.includes('sweet')) return 'dessert';
  if (lowerKw.includes('red') || lowerKw.includes('cabernet') || lowerKw.includes('merlot') || lowerKw.includes('pinot noir') || lowerKw.includes('syrah') || lowerKw.includes('malbec') || lowerKw.includes('zinfandel')) return 'red';

  return null;
}

function inferFallbackRegion(keyword: string): string | null {
  const lowerKw = keyword.toLowerCase();
  const regions = [
    'napa', 'sonoma', 'burgundy', 'bordeaux', 'champagne', 'piedmont', 'rioja',
    'tuscany', 'oregon', 'washington', 'california', 'portugal', 'mosel',
  ];

  return regions.find(region => lowerKw.includes(region)) || null;
}

function normalizeRecommendationIdentity(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(\w+)\s+\1\b/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapCatalogWineToRecommendation(wine: any, keyword: string): any {
  const rawName = `${wine.vintage ? `${wine.vintage} ` : ''}${wine.producer} ${wine.wine_name}`.trim();
  const displayName = rawName
    .replace(new RegExp(`\\b${String(wine.producer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+${String(wine.producer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), String(wine.producer))
    .replace(/\s+/g, ' ')
    .trim();
  const variety = wine.variety || 'Blend';
  const region = wine.region || wine.subregion || 'Unknown region';
  const lowerVariety = String(variety).toLowerCase();
  let wineType = 'red';
  if (lowerVariety.includes('sparkling') || lowerVariety.includes('champagne') || lowerVariety.includes('prosecco')) wineType = 'sparkling';
  else if (lowerVariety.includes('rose') || lowerVariety.includes('rosé')) wineType = 'rosé';
  else if (lowerVariety.includes('chardonnay') || lowerVariety.includes('sauvignon') || lowerVariety.includes('riesling') || lowerVariety.includes('pinot grigio') || lowerVariety.includes('pinot gris')) wineType = 'white';

  return {
    name: displayName,
    producer: wine.producer,
    region,
    vintage: wine.vintage,
    variety,
    wine_type: wineType,
    notes: `A useful bottle to explore while researching ${keyword}, with regional and varietal cues that help ground the topic in real wines.`,
  };
}

async function getFallbackRecommendations(
  keyword: string,
  category: 'learn' | 'wine-pairings' | 'buy'
): Promise<any[]> {
  if (category === 'buy') {
    return [];
  }

  const region = inferFallbackRegion(keyword);
  if (region) {
    const regionalWines = await getWinesByRegion(region, 3);
    if (regionalWines.length > 0) {
      return regionalWines.map((wine: any) => mapCatalogWineToRecommendation(wine, keyword));
    }
  }

  const wineType = inferFallbackWineType(keyword);
  if (wineType) {
    const typeWines = await getWinesByType(wineType, 3);
    if (typeWines.length > 0) {
      return typeWines.map((wine: any) => mapCatalogWineToRecommendation(wine, keyword));
    }
  }

  const randomWines = await getRandomWines(3, wineType || undefined);
  return randomWines.map((wine: any) => mapCatalogWineToRecommendation(wine, keyword));
}

async function ensureMinimumRecommendations(
  keyword: string,
  category: 'learn' | 'wine-pairings' | 'buy',
  wines: any[],
  minimum: number = 3
): Promise<any[]> {
  if (wines.length >= minimum) {
    return wines;
  }

  const supplemental = await getFallbackRecommendations(keyword, category);
  const merged = [...wines];
  const seen = new Set(merged.map(wine => normalizeRecommendationIdentity(wine.name)));

  for (const wine of supplemental) {
    const identity = normalizeRecommendationIdentity(wine.name);
    if (seen.has(identity)) continue;
    merged.push(wine);
    seen.add(identity);
    if (merged.length >= minimum) break;
  }

  return merged;
}

function canGenerateWithoutBottlePicks(keyword: string, category: 'learn' | 'wine-pairings' | 'buy'): boolean {
  if (category !== 'learn') {
    return false;
  }

  const lowerKw = keyword.toLowerCase();
  return lowerKw.includes('vs') ||
    lowerKw.includes('beginner') ||
    lowerKw.includes('how to') ||
    lowerKw.includes('how ') ||
    lowerKw.includes('what is') ||
    lowerKw.includes('guide') ||
    lowerKw.includes('serve') ||
    lowerKw.includes('store') ||
    lowerKw.includes('calories') ||
    lowerKw.includes('natural wine');
}

// ============================================================================
// Content Generation
// ============================================================================

type ArticleArchetype = 'learn' | 'pairing' | 'buy' | 'comparison';

function toTitleCase(text: string): string {
  return text
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function determineArticleArchetype(keyword: string, category: 'learn' | 'wine-pairings' | 'buy'): ArticleArchetype {
  const lowerKw = keyword.toLowerCase();
  if (/\bvs\b|versus/.test(lowerKw)) return 'comparison';
  if (category === 'wine-pairings') return 'pairing';
  if (category === 'buy') return 'buy';
  return 'learn';
}

function extractFoodTarget(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/^.*?with\s+/i, '')
    .replace(/\s+pairing.*$/i, '')
    .replace(/^best\s+wine\s+for\s+/i, '')
    .replace(/^wine\s+for\s+/i, '')
    .replace(/wine\s*/i, '')
    .trim();
}

function generateIntro(keyword: string, archetype: ArticleArchetype): string {
  switch (archetype) {
    case 'comparison':
      return `${toTitleCase(keyword)} is usually a decision problem, not a trivia problem. The useful move is to compare body, acidity, fruit profile, and when each style works best at the table so you can choose the right bottle faster.`;
    case 'pairing':
      return `Good ${keyword} advice starts with the dish, not the bottle. Weight, salt, fat, acid, and cooking method all matter more than generic red-versus-white rules, so this guide focuses on how the meal behaves in the glass and on the plate.`;
    case 'buy':
      return `Buying ${keyword} gets easier once you know where quality actually shows up. Price matters, but producer discipline, region, and style cues tell you far more about whether a bottle will drink like a smart buy or an expensive miss.`;
    default:
      return `${toTitleCase(keyword)} is most useful when it becomes practical. Instead of repeating broad tasting-note language, this guide focuses on the markers that help you recognize the style, buy better bottles, and know what to try next.`;
  }
}

function generateQuickAnswer(keyword: string, archetype: ArticleArchetype, recommendationMode: 'direct' | 'fallback' | 'educational'): string {
  if (archetype === 'pairing') {
    const food = extractFoodTarget(keyword) || 'the dish';
    return `For ${food}, look for wines whose weight matches the food and whose acidity or tannin solves the main texture problem on the plate. Start with balanced, food-friendly styles, then adjust based on sauce, smoke, spice, and richness.`;
  }

  if (archetype === 'buy') {
    return `Shop ${keyword} by producer, region, and style before you shop by hype. If the goal is value, lesser-known regions and disciplined producers usually outperform famous labels at the same price.`;
  }

  if (archetype === 'comparison') {
    return `The better choice in ${keyword} depends on what you value most: freshness, body, fruit profile, structure, and what you plan to eat with it. Compare the styles on those five levers and the right bottle becomes much easier to spot.`;
  }

  if (recommendationMode === 'educational') {
    return `Treat ${keyword} like a tasting framework. Learn the defining markers first, then compare two or three benchmark bottles side by side so the style becomes obvious in the glass instead of staying theoretical.`;
  }

  return `Start with benchmark bottles and use them to anchor your palate. Once you know the classic style for ${keyword}, it becomes much easier to judge value, spot regional differences, and buy with confidence.`;
}

function generateDefaultFAQs(keyword: string, archetype: ArticleArchetype): { question: string; answer: string }[] {
  if (archetype === 'pairing') {
    const food = extractFoodTarget(keyword) || 'this dish';
    return [
      {
        question: `What style of wine usually works best with ${food}?`,
        answer: `Start with styles that match the dish's intensity and solve its biggest challenge. Richer dishes often need acidity or tannin to keep the pairing fresh, while delicate dishes usually work better with lighter, cleaner wines.`,
      },
      {
        question: `Does sauce matter more than the protein in ${keyword}?`,
        answer: `Often, yes. Cream sauces, spice, char, sweetness, and tomato acidity can completely change the pairing even when the main protein stays the same, so evaluate the full plate rather than only the headline ingredient.`,
      },
      {
        question: `Should I serve the wine colder or warmer with ${food}?`,
        answer: `Serve a touch cooler than room temperature for reds and properly chilled for whites or sparkling wines. Temperature changes how tannin, acidity, and alcohol show up, which directly affects how the pairing feels with food.`,
      },
      {
        question: `What is the safest fallback if I am unsure about ${keyword}?`,
        answer: `Reach for a balanced, medium-bodied, food-friendly bottle with solid acidity. That profile covers more dishes well than heavily oaked, overly alcoholic, or aggressively tannic wines.`,
      },
    ];
  }

  if (archetype === 'buy') {
    return [
      {
        question: `What should I prioritize when buying ${keyword}?`,
        answer: `Prioritize producer consistency, region, and style fit before chasing critic language or luxury branding. Those three signals usually tell you more about whether the bottle will drink well for the money.`,
      },
      {
        question: `Is expensive ${keyword} always better?`,
        answer: `No. Higher prices can reflect scarcity, prestige, or age-worthiness, but there are many cases where a disciplined producer in a less fashionable region offers better drinking value than a famous label.`,
      },
      {
        question: `How can I spot value in ${keyword}?`,
        answer: `Look for second labels, strong cooperatives, emerging subregions, and producers with a clear house style. Value usually comes from smart sourcing and overlooked geography, not from the loudest shelf talker.`,
      },
      {
        question: `How many bottles of ${keyword} should I buy at once?`,
        answer: `If you find a bottle that clearly outperforms its price, buy enough to taste it now and revisit it later. A small repeat purchase is one of the fastest ways to learn whether a wine is a true value or a one-off good showing.`,
      },
    ];
  }

  if (archetype === 'comparison') {
    return [
      {
        question: `What is the biggest difference in ${keyword}?`,
        answer: `Usually the biggest difference is structural: body, acidity, tannin, and fruit profile. Once you isolate which wine is fresher, richer, softer, or more savory, the comparison becomes much easier to use in real buying decisions.`,
      },
      {
        question: `Is one side of ${keyword} better for food?`,
        answer: `Not universally. One style may be more flexible at the table, while the other may be better for sipping or richer dishes. The right answer depends on the meal and whether you want contrast or harmony.`,
      },
      {
        question: `Can beginners understand ${keyword} through tasting?`,
        answer: `Yes. Tasting the two styles side by side is the fastest way to understand the comparison. Focus on body, acidity, fruit ripeness, and finish instead of trying to memorize every tasting term.`,
      },
      {
        question: `Should I buy both sides of ${keyword}?`,
        answer: `If you want to learn quickly, yes. Buying one benchmark bottle from each side of the comparison gives you a practical frame of reference that makes future shopping decisions much easier.`,
      },
    ];
  }

  return [
    {
      question: `What should I pay attention to first with ${keyword}?`,
      answer: `Start with the structural markers: body, acidity, fruit profile, texture, and finish. Those clues tell you more about style and quality than isolated tasting-note words.`,
    },
    {
      question: `Is ${keyword} approachable for newer wine drinkers?`,
      answer: `Usually, yes, especially if you begin with benchmark producers and clearly labeled styles. A focused tasting across two or three examples teaches the category faster than reading broad summaries in isolation.`,
    },
    {
      question: `How should I serve ${keyword}?`,
      answer: `Serve it at a temperature that keeps the wine balanced rather than hot or over-chilled. Good serving temperature helps acidity, tannin, and aromatics show up in a cleaner, more useful way.`,
    },
    {
      question: `What should I try after ${keyword}?`,
      answer: `Try one bottle that stays close to the classic style and one that stretches it. That contrast is where most people start to understand regional and stylistic differences in a meaningful way.`,
    },
  ];
}

function generateWineHTML(wines: any[]): string {
  if (wines.length === 0) return '';

  return wines.map((wine, i) => `
      <div class="bg-gray-50 rounded-lg p-6 mb-4">
        <h3 class="text-xl font-semibold text-wine-700 mb-2">${i + 1}. ${wine.name}</h3>
        <p class="text-gray-600 mb-2"><strong>Producer:</strong> ${wine.producer}</p>
        <p class="text-gray-600 mb-2"><strong>Region:</strong> ${wine.region}</p>
        <p class="text-gray-600 mb-2"><strong>Variety:</strong> ${wine.variety || 'Blend'}</p>
        <p class="text-gray-700 mt-3">${wine.notes}</p>
      </div>`).join('\n');
}

function generateEducationalExplorationHTML(keyword: string): string {
  return `
      <div class="space-y-4 text-gray-700">
        <p>For a topic like <strong>${keyword}</strong>, start with benchmark bottles and compare them side by side. Focus on body, acidity, fruit profile, alcohol, and finish so the category becomes concrete instead of abstract.</p>
        <p>Use this guide as a tasting plan. Try one classic example, one modern or higher-fruit example, and one bottle from a different region if possible. That sequence gives you a much clearer read on the topic than generic tasting-note language alone.</p>
      </div>`;
}

function generateExpertTipsHTML(keyword: string, archetype: ArticleArchetype): string {
  let tips: string[] = [];

  if (archetype === 'pairing') {
    tips = [
      `<strong>Match weight before flavor notes</strong> - A lean dish with a heavy, oaky wine feels clumsy even if the tasting notes sound compatible.`,
      `<strong>Let acid do the cleanup</strong> - Rich, fried, creamy, or buttery foods often need a wine with enough acidity to reset the palate.`,
      `<strong>Sauce can overrule the protein</strong> - A tomato, cream, pepper, or sweet glaze often matters more than whether the plate is chicken, pork, or seafood.`,
      `<strong>Use tannin carefully</strong> - Tannic reds love fat and protein, but they can turn harsh with spicy heat or bitter greens.`,
      `<strong>Test with a small sip-and-bite cycle</strong> - The first three bites usually tell you whether the pairing is getting cleaner, flatter, or more aggressive.`,
    ];
  } else if (archetype === 'buy') {
    tips = [
      `<strong>Buy producer first</strong> - A reliable producer in an overlooked region often beats a famous appellation with weaker farming or cellar work.`,
      `<strong>Price should match the occasion</strong> - Everyday value bottles and cellar-worthy bottles solve different problems, so do not shop them with the same standard.`,
      `<strong>Look for style clues on the label</strong> - Region, alcohol level, and producer reputation usually tell you more than flashy shelf copy.`,
      `<strong>Use one benchmark bottle</strong> - Having one trusted reference point makes it much easier to judge whether a new bottle is overpriced or underpriced.`,
      `<strong>Track repeat winners</strong> - The goal is not one lucky bottle. The goal is building a list of producers and regions you can buy confidently on autopilot.`,
    ];
  } else if (archetype === 'comparison') {
    tips = [
      `<strong>Taste side by side</strong> - Comparisons become obvious faster when both wines are open at the same time under the same conditions.`,
      `<strong>Write down the structural difference</strong> - Note which wine is fresher, fuller, softer, firmer, or more savory before you chase aroma details.`,
      `<strong>Check the context</strong> - One side of the comparison may win on its own, while the other wins at the dinner table.`,
      `<strong>Do not confuse ripeness with quality</strong> - Bigger fruit and more oak can feel impressive, but that is not automatically the better wine for every use case.`,
      `<strong>Use the comparison to shop smarter</strong> - Once you know which side suits your palate, region and producer choices get much easier.`,
    ];
  } else {
    tips = [
      `<strong>Anchor the classic style first</strong> - Start with a benchmark example before exploring edge cases or trend-driven bottles.`,
      `<strong>Pay attention to structure</strong> - Body, acidity, tannin, and finish are the fastest way to understand a wine topic in practical terms.`,
      `<strong>Temperature changes the story</strong> - Serving a wine too warm or too cold can hide the traits you are trying to learn.`,
      `<strong>Take short tasting notes</strong> - One line on style, one line on food fit, and one line on whether you would rebuy is enough to improve quickly.`,
      `<strong>Move from broad to narrow</strong> - Learn the category, then compare producers, regions, and price tiers once the foundation is clear.`,
    ];
  }

  return `
      <ol class="list-decimal list-inside space-y-4 text-gray-700">
        ${tips.map(tip => `<li>${tip}</li>`).join('\n        ')}
      </ol>`;
}

function generateFAQHTML(faqs: { question: string; answer: string }[]): string {
  return `
      <div class="space-y-6">
        ${faqs.map(faq => `
        <div>
          <h3 class="text-lg font-semibold text-wine-700 mb-2">${faq.question}</h3>
          <p class="text-gray-700">${faq.answer}</p>
        </div>`).join('')}
      </div>`;
}

function generateRelatedGuidesHTML(
  keyword: string,
  category: 'learn' | 'wine-pairings' | 'buy'
): string {
  const links = suggestLinksForArticle(keyword, category, 3);
  const fallbackLinks = [
    { href: '/learn', label: 'Wine guides', reason: 'Broader context' },
    { href: '/wine-pairings', label: 'Wine pairings', reason: 'Food context' },
    { href: '/buy', label: 'Buying guides', reason: 'Commercial next step' },
  ];
  const finalLinks = links.length > 0 ? links : fallbackLinks;

  return `
      <div class="grid gap-4 md:grid-cols-3">
        ${finalLinks.map(link => `
        <a href="${link.href}" class="block rounded-lg border border-gray-200 p-4 hover:border-wine-300 hover:bg-gray-50 transition">
          <h3 class="text-lg font-semibold text-wine-700 mb-2">${link.label}</h3>
          <p class="text-sm text-gray-700">${'reason' in link ? link.reason : 'Related reading'}</p>
        </a>`).join('')}
      </div>`;
}

function buildIntentSections(
  keyword: string,
  archetype: ArticleArchetype,
  wines: any[],
  recommendationMode: 'direct' | 'fallback' | 'educational',
  category: 'learn' | 'wine-pairings' | 'buy'
): { heading: string; body: string }[] {
  const displayKeyword = toTitleCase(keyword);
  const picksHeading = recommendationMode === 'direct'
    ? 'Bottles That Illustrate The Style'
    : recommendationMode === 'fallback'
      ? 'Real Bottles To Explore'
      : 'How To Explore This Topic';
  const picksContent = wines.length > 0
    ? generateWineHTML(wines)
    : generateEducationalExplorationHTML(keyword);

  switch (archetype) {
    case 'comparison':
      return [
        {
          heading: `What Changes In ${displayKeyword}`,
          body: `<p>${generateIntro(keyword, archetype)}</p><p>Focus first on body, acidity, tannin, fruit ripeness, and finish. Those five markers usually explain why one side of the comparison feels fresher, broader, softer, or more structured, and they translate directly into better bottle choices.</p>`,
        },
        {
          heading: 'How To Decide Which Style Fits The Moment',
          body: `<p>Use food, occasion, and budget as your filter. If you are pouring the wine with dinner, think about whether you need freshness, richness, or flexibility. If the bottle is for sipping on its own, texture and finish may matter more than pairing versatility.</p><p>Side-by-side tasting is the fastest shortcut. One benchmark bottle from each side will teach you more in twenty minutes than a week of abstract tasting-note reading.</p>`,
        },
        {
          heading: picksHeading,
          body: picksContent,
        },
        {
          heading: 'Common Comparison Mistakes',
          body: `<p>The most common mistake is treating one side as “better” in every situation. Many wine comparisons are really about fit: one style works better with richer food, another is better with lighter dishes or for casual drinking.</p><p>The second mistake is comparing non-equivalent bottles. If one bottle is heavily oaked, overripe, or from a very different price tier, you are learning more about winemaking choices than the core comparison itself.</p>`,
        },
        {
          heading: 'How To Taste The Difference Faster',
          body: `<p>Pour both wines at the same time and alternate between them with water in between. That makes changes in texture, acidity, and finish much easier to notice than tasting one bottle in isolation.</p><p>Write down one sentence on aroma, one on structure, and one on food fit. Short, disciplined notes usually teach you more than trying to capture every possible descriptor.</p>`,
        },
      ];
    case 'pairing':
      return [
        {
          heading: `How To Think About ${displayKeyword}`,
          body: `<p>${generateIntro(keyword, archetype)}</p><p>Look at the dish in terms of fat, salt, acid, sweetness, spice, and char. Those elements tell you whether the wine needs cleansing acidity, softer tannin, brighter fruit, or more body.</p>`,
        },
        {
          heading: 'What Usually Works Best',
          body: `<p>Most successful pairings solve the dish's biggest texture or flavor problem. Acid cuts richness, tannin grips protein and fat, fruit cushions spice, and lighter-bodied wines protect delicate flavors from being buried.</p><p>Once you know the dominant element on the plate, the range of good wine choices narrows quickly and the pairing becomes much more repeatable.</p>`,
        },
        {
          heading: picksHeading,
          body: picksContent,
        },
        {
          heading: 'Serving And Pairing Adjustments',
          body: `<p>If the pairing feels heavy, chill the wine slightly or move to a brighter style. If it feels sharp or thin, pick a riper, rounder bottle or reduce the acidity on the plate. Small adjustments in temperature and sauce often fix a pairing faster than switching categories completely.</p>`,
        },
        {
          heading: 'When To Break The Usual Pairing Rule',
          body: `<p>Rules are useful until the dish changes shape. Smoke, sweetness, chili heat, and heavy sauces often justify moving away from the textbook pairing and toward a bottle that handles the dominant flavor more cleanly.</p><p>The best test is whether the wine keeps the next bite feeling clearer and more appetizing. If it dulls the food or makes the finish harsher, change the bottle.</p>`,
        },
      ];
    case 'buy':
      return [
        {
          heading: `What Matters Most When Buying ${displayKeyword}`,
          body: `<p>${generateIntro(keyword, archetype)}</p><p>Separate shopping goals before you buy. A reliable weeknight bottle, a cellar candidate, and a gift bottle all deserve different standards, and most bad purchases happen when those goals get blurred together.</p>`,
        },
        {
          heading: 'How To Spot Quality Faster',
          body: `<p>Look for consistency markers: serious producers, coherent regional identity, and a style that matches the occasion. That gives you a better edge than chasing point scores in a vacuum or assuming the highest price is the safest bottle.</p><p>If you are shopping on value, favor overlooked regions and disciplined producers rather than prestige labels that already price in reputation.</p>`,
        },
        {
          heading: 'Best Fit By Buyer Type',
          body: `<p>If you want everyday value, prioritize bottles with strong producer discipline and lower hype premiums. If you are buying for a dinner party, flexibility and food-friendliness matter more than rarity. If the bottle is a gift, presentation and producer recognition start to matter more alongside quality.</p><p>This framing keeps the page useful because it answers the real question behind most searches: not just “what is good?” but “what is right for how I plan to use it?”</p>`,
        },
        {
          heading: picksHeading,
          body: picksContent,
        },
        {
          heading: 'When It Is Worth Spending More',
          body: `<p>Spend more when you are paying for a meaningful jump in balance, age-worthiness, precision, or site character. Do not spend more just because the bottle is famous. Prestige pricing is real, and the gap between “better wine” and “better label” matters.</p>`,
        },
        {
          heading: 'How To Build A Reliable Buying Bench',
          body: `<p>Once you find a producer or region that consistently delivers for your palate, use it as a benchmark. That gives you a practical reference when comparing new bottles and helps you avoid chasing random one-off recommendations.</p><p>Over time, a short list of benchmark bottles becomes the backbone of an autonomous buying system, which is exactly what most drinkers need more than endless option lists.</p>`,
        },
        {
          heading: 'What To Avoid',
          body: `<p>Avoid buying based only on shelf hype, luxury branding, or a vague promise of smoothness. Those cues are often expensive shortcuts around the actual question of whether the wine fits your taste, the occasion, and the food.</p><p>Also avoid mixing price tiers in your own reference points. If every comparison bottle in your head comes from a different style and budget, your buying decisions will stay noisy instead of getting sharper over time.</p>`,
        },
      ];
    default:
      return [
        {
          heading: `Understanding ${displayKeyword}`,
          body: `<p>${generateIntro(keyword, archetype)}</p><p>When you learn a wine topic, focus on the practical markers that show up every time you open a bottle: body, acid line, tannin level, fruit profile, and how the wine finishes. Those clues are more durable than memorizing long tasting-note lists.</p>`,
        },
        {
          heading: 'What To Notice In The Glass',
          body: `<p>Try to describe what the wine is doing structurally before you describe aroma details. Is it lean or broad, crisp or soft, savory or fruit-driven, short or persistent? That framework helps you understand the style well enough to buy and pair with intention.</p>`,
        },
        {
          heading: picksHeading,
          body: picksContent,
        },
        {
          heading: 'How To Keep Learning Without Guessing',
          body: `<p>Use one classic example as your baseline, then compare it with a bottle from another producer, region, or price tier. Controlled comparison is how you move from “I liked this” to “I understand why this tastes different.”</p>`,
        },
        {
          heading: 'What To Taste Next',
          body: `<p>After you understand the baseline style, explore one adjacent category that shares a few markers and one category that contrasts sharply. That creates a much stronger mental map than repeatedly tasting small variations of the same bottle profile.</p><p>If you keep simple notes on what changed, you will build a reusable framework for future buying and pairing decisions rather than starting from zero each time.</p>`,
        },
      ];
  }
}

// ============================================================================
// Article Generation
// ============================================================================

function generateArticleContent(
  keyword: string,
  wines: any[],
  author: any,
  slug: string,
  category: 'learn' | 'wine-pairings' | 'buy',
  imageData: { success: boolean; altText: string; caption: string },
  recommendationMode: 'direct' | 'fallback' | 'educational'
): string {
  const intent = determineIntent(keyword);
  const archetype = determineArticleArchetype(keyword, category);
  const clusterKey = deriveClusterKey(keyword);
  const intentClass = determineIntentClass(keyword);
  const pageRole = determinePageRole(keyword, category);
  const title = generateSEOTitle(keyword, category);
  const description = generateMetaDescription(keyword, intent);
  const canonicalUrl = generateCanonicalUrl(category, slug);
  const today = new Date().toISOString().split('T')[0];

  // Generate FAQs for schema
  const faqs = generateDefaultFAQs(keyword, archetype);
  const sections = buildIntentSections(keyword, archetype, wines, recommendationMode, category);
  const relatedGuides = generateRelatedGuidesHTML(keyword, category);

  // Build structured data with multiple schemas
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      // Article schema
      {
        "@type": "Article",
        "headline": title,
        "description": description,
        "image": imageData.success ? `https://winesquickstart.com/images/articles/${slug}.png` : undefined,
        "author": {
          "@type": "Person",
          "name": author.name,
          "jobTitle": author.role,
          "url": `https://winesquickstart.com/about/${author.slug}`,
        },
        "publisher": {
          "@type": "Organization",
          "name": "Wine Quick Start",
          "logo": {
            "@type": "ImageObject",
            "url": "https://winesquickstart.com/logo.png",
          }
        },
        "datePublished": new Date().toISOString(),
        "dateModified": new Date().toISOString(),
        "mainEntityOfPage": canonicalUrl,
      },
      // Breadcrumb schema
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://winesquickstart.com" },
          { "@type": "ListItem", "position": 2, "name": category === 'learn' ? 'Wine Guides' : category === 'wine-pairings' ? 'Wine Pairings' : 'Buying Guides', "item": `https://winesquickstart.com/${category}` },
          { "@type": "ListItem", "position": 3, "name": title, "item": canonicalUrl },
        ]
      },
      // FAQ schema
      {
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": { "@type": "Answer", "text": faq.answer }
        }))
      }
    ]
  };

  // Build imports
  const imports = [`import ArticleLayout from '../../layouts/ArticleLayout.astro';`];
  if (imageData.success) {
    imports.push(`import featuredImage from '../../assets/images/articles/${slug}.png';`);
  }

  // Build layout props
  const layoutProps = [
    `title={frontmatter.title}`,
    `description={frontmatter.description}`,
    `author={frontmatter.author}`,
    `readTime={frontmatter.readTime}`,
    `category="${category === 'learn' ? 'Wine Guide' : category === 'wine-pairings' ? 'Wine Pairing' : 'Buying Guide'}"`,
    `schema={frontmatter.structured_data}`,
  ];
  if (imageData.success) {
    layoutProps.push(`featuredImage={featuredImage}`);
    layoutProps.push(`featuredImageAlt={frontmatter.featuredImageAlt}`);
  }

  const keywordParts = keyword.split(' ').filter(w => w.length > 2);
  const picksHeading = recommendationMode === 'direct'
    ? 'Our Top Picks'
    : recommendationMode === 'fallback'
      ? 'Real Bottles To Explore'
      : 'How To Explore This Topic';
  const picksContent = wines.length > 0
    ? generateWineHTML(wines)
    : generateEducationalExplorationHTML(keyword);

  const content = `---
${imports.join('\n')}

const frontmatter = {
  title: "${title}",
  description: "${description}",
  pubDate: "${today}",
  author: "${author.name}",
  authorRole: "${author.role}",
  authorSlug: "${author.slug}",
  readTime: "6 min",
  clusterKey: "${clusterKey}",
  intentClass: "${intentClass}",
  pageRole: "${pageRole}",
  keywords: ["${keyword}", ${keywordParts.map(w => `"${w}"`).join(', ')}, "wine guide", "sommelier picks"],
  canonicalUrl: "${canonicalUrl}",
  ${imageData.success ? `featuredImageAlt: "${imageData.altText}",` : ''}
  structured_data: ${JSON.stringify(structuredData, null, 4).split('\n').join('\n  ')}
};
---

<ArticleLayout ${layoutProps.join(' ')}>
  <!-- Author Attribution -->
  <div class="bg-gray-50 p-4 rounded-lg mb-6 flex items-center gap-4">
    <div class="w-12 h-12 rounded-full bg-wine-100 flex items-center justify-center text-wine-700 font-bold">
      ${author.name.split(' ').map((n: string) => n[0]).join('')}
    </div>
    <div>
      <a href="/about/${author.slug}" class="font-semibold text-gray-900 hover:text-wine-600">${author.name}</a>
      <p class="text-sm text-gray-600">${author.role} | ${author.credentials[0]}</p>
    </div>
  </div>

  <div slot="quick-answer">
    <p><strong>Quick Answer:</strong> ${generateQuickAnswer(keyword, archetype, recommendationMode)}</p>
  </div>

  ${sections.map(section => `
  <h2>${section.heading}</h2>
  ${section.body}`).join('\n')}

  <h2>Expert Tips</h2>
  ${generateExpertTipsHTML(keyword, archetype)}

  <h2>Related Guides</h2>
  ${relatedGuides}

  <h2>Frequently Asked Questions</h2>
  ${generateFAQHTML(faqs)}

  <!-- Author Bio Footer -->
  <div class="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
    <h3 class="text-lg font-semibold mb-3">About the Author</h3>
    <div class="flex items-start gap-4">
      <div class="w-16 h-16 rounded-full bg-wine-100 flex items-center justify-center text-wine-700 font-bold text-xl flex-shrink-0">
        ${author.name.split(' ').map((n: string) => n[0]).join('')}
      </div>
      <div>
        <a href="/about/${author.slug}" class="font-semibold text-wine-600 hover:text-wine-800">${author.name}</a>
        <p class="text-sm text-gray-600 mb-2">${author.role}</p>
        <p class="text-sm text-gray-700">${author.shortBio}</p>
      </div>
    </div>
  </div>
</ArticleLayout>
`;

  return content;
}

// ============================================================================
// Main Generation Function
// ============================================================================

async function generateArticles() {
  console.log('🍷 Enhanced Article Generator\n');
  console.log('═══════════════════════════════════════════════\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Limit: ${limit} articles`);
  console.log(`Min Priority: ${minPriority}\n`);
  if (specificKeyword) {
    console.log(`Keyword mode: "${specificKeyword}"\n`);
  }

  // Get existing pages
  const { slugs: existingSlugs, topics: existingTopics } = getExistingPages();
  console.log(`📄 Found ${existingSlugs.size} existing articles`);
  console.log(`🔍 Tracking ${existingTopics.size} unique topics\n`);

  let keywords: any[] | null = null;
  let error: any = null;

  if (specificKeyword) {
    // Deterministic mode: fetch exactly one requested keyword
    const response = await client
      .from('keyword_opportunities')
      .select('*')
      .eq('keyword', specificKeyword)
      .limit(1);
    keywords = response.data;
    error = response.error;
  } else {
    // Default mode: fetch by priority
    const response = await client
      .from('keyword_opportunities')
      .select('*')
      .or('status.is.null,status.eq.active')
      .gte('priority', minPriority)
      .order('priority', { ascending: false })
      .order('search_volume', { ascending: false })
      .limit(50);
    keywords = response.data;
    error = response.error;
  }

  if (error) {
    console.error('Error fetching keywords:', error);
    return;
  }

  if (!keywords || keywords.length === 0) {
    console.log('No eligible high-priority keywords found');
    return;
  }

  if (specificKeyword) {
    console.log(`🎯 Found requested keyword\n`);
  } else {
    console.log(`🎯 Found ${keywords.length} keywords with priority >= ${minPriority}\n`);
  }

  // Filter duplicates
  const keywordsNeedingArticles = keywords.filter(kw => {
    const slug = keywordToSlug(kw.keyword);

    if (existingSlugs.has(slug)) {
      console.log(`  ⏭️  Skip "${kw.keyword}" - article exists`);
      return false;
    }

    if (isDuplicateTopic(kw.keyword, existingTopics)) {
      console.log(`  ⏭️  Skip "${kw.keyword}" - similar topic exists`);
      return false;
    }

    return true;
  });

  console.log(`\n📝 ${keywordsNeedingArticles.length} keywords need articles\n`);

  if (keywordsNeedingArticles.length === 0) {
    console.log('✅ All high-priority keywords have articles!');
    return;
  }

  // Generate articles
  const toGenerate = keywordsNeedingArticles;
  let generated = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < toGenerate.length; i++) {
    if (generated >= limit) break;

    const kw = toGenerate[i];

    console.log(`\n🔄 [${i + 1}/${toGenerate.length}] "${kw.keyword}"`);
    console.log(`   Priority: ${kw.priority} | Volume: ${kw.search_volume}/mo`);

    try {
      const slug = keywordToSlug(kw.keyword);
      const category = determineCategory(kw.keyword);
      const filePath = path.join(process.cwd(), 'src/pages', category, `${slug}.astro`);

      // Check for matching wines
      let wines = await getWinesForKeyword(kw.keyword, 3);
      let recommendationMode: 'direct' | 'fallback' | 'educational' = 'direct';

      if (wines.length === 0) {
        wines = await getFallbackRecommendations(kw.keyword, category);
        if (wines.length > 0) {
          recommendationMode = 'fallback';
          console.log(`   🍷 Using ${wines.length} fallback catalog wines for broader topic coverage`);
        } else if (canGenerateWithoutBottlePicks(kw.keyword, category)) {
          recommendationMode = 'educational';
          console.log(`   📝 No direct catalog matches - proceeding with educational guide format`);
        } else {
          console.log(`   ⏭️  Skipping - no matching wines in catalog`);
          skipped++;
          continue;
        }
      } else {
        console.log(`   🍷 Found ${wines.length} wine recommendations`);
      }

      if (recommendationMode !== 'educational') {
        wines = await ensureMinimumRecommendations(kw.keyword, category, wines, 3);
        console.log(`   🍇 Final recommendation set: ${wines.length} bottles`);
      }

      if (isDryRun) {
        console.log(`   📋 Would create: ${category}/${slug}.astro`);
        generated++;
        continue;
      }

      // Generate image
      let imageData = { success: false, altText: '', caption: '' };
      if (replicateToken) {
        imageData = await generateArticleImage(slug, kw.keyword, replicateToken);

        // Rate limit between image generations
        if (imageData.success && i < toGenerate.length - 1) {
          console.log(`   ⏳ Rate limit pause (10s)...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }

      // Get author
      const author = getRandomAuthor();

      // Generate content
      const content = generateArticleContent(
        kw.keyword,
        wines,
        author,
        slug,
        category,
        imageData,
        recommendationMode
      );

      // Write file
      fs.writeFileSync(filePath, content);
      console.log(`   ✅ Created: ${category}/${slug}.astro`);

      // Track topic to prevent duplicates in same run
      existingTopics.add(normalizeToCoreTopic(slug));

      // Mark keyword as used (can be disabled for orchestrators)
      if (!noMarkUsed) {
        await client
          .from('keyword_opportunities')
          .update({ status: 'used', used_at: new Date().toISOString() })
          .eq('keyword', kw.keyword);
      }

      generated++;

    } catch (err) {
      console.error(`   ❌ Failed: ${err}`);
      failed++;
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('📋 GENERATION SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ Generated: ${generated}`);
  console.log(`⏭️  Skipped (no wines): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${toGenerate.length}`);

  if (generated > 0 && !isDryRun) {
    console.log('\n📄 Articles Created:');
    toGenerate.slice(0, generated + skipped).forEach((kw, i) => {
      if (i < generated) {
        const category = determineCategory(kw.keyword);
        const slug = keywordToSlug(kw.keyword);
        console.log(`   ✅ ${category}/${slug}.astro`);
      }
    });
  }
}

// Run
generateArticles()
  .then(() => {
    console.log('\n✅ Article generation complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
