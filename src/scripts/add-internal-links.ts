/**
 * Internal Linking Script
 *
 * Scans all articles, builds a fresh registry, and adds related article sections
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArticleData {
  slug: string;
  path: string;
  url: string;
  title: string;
  description: string;
  category: 'learn' | 'buy' | 'wine-pairings';
  topics: string[];
  keywords: string[];
  wineTypes: string[];
  regions: string[];
  varieties: string[];
  pricePoints: string[];
  foodPairings: string[];
}

interface RelatedArticle {
  title: string;
  slug: string;
  url: string;
  description: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Detection Patterns
// ---------------------------------------------------------------------------

const WINE_TYPES = ['red', 'white', 'rosé', 'rose', 'sparkling', 'orange', 'dessert', 'fortified'];

const VARIETIES = [
  'cabernet sauvignon', 'merlot', 'pinot noir', 'syrah', 'shiraz', 'zinfandel',
  'malbec', 'tempranillo', 'sangiovese', 'nebbiolo', 'grenache', 'mourvedre',
  'chardonnay', 'sauvignon blanc', 'riesling', 'pinot grigio', 'pinot gris',
  'gewurztraminer', 'viognier', 'chenin blanc', 'semillon', 'gruner veltliner',
  'champagne', 'prosecco', 'cava', 'barolo', 'barbaresco', 'brunello', 'chianti'
];

const REGIONS = [
  // France
  'bordeaux', 'burgundy', 'champagne', 'rhone', 'rhône', 'loire', 'alsace', 'provence',
  // USA
  'napa valley', 'napa', 'sonoma', 'california', 'oregon', 'washington', 'willamette',
  // Italy
  'piedmont', 'tuscany', 'veneto', 'sicily', 'barolo', 'barbaresco',
  // Spain
  'rioja', 'priorat', 'ribera del duero',
  // Others
  'barossa', 'marlborough', 'mendoza', 'stellenbosch', 'mosel', 'germany', 'argentina', 'chile', 'australia', 'new zealand'
];

const FOOD_PAIRINGS = [
  'steak', 'beef', 'lamb', 'pork', 'chicken', 'turkey', 'duck',
  'salmon', 'fish', 'seafood', 'shrimp', 'lobster', 'oysters', 'sushi',
  'pasta', 'pizza', 'risotto', 'cheese', 'charcuterie',
  'thanksgiving', 'christmas', 'bbq', 'barbecue', 'grilled'
];

const PRICE_POINTS = [
  { pattern: /under.?\$?20|budget|cheap|affordable/i, value: 'under-20' },
  { pattern: /under.?\$?50|mid.?range/i, value: 'under-50' },
  { pattern: /premium|luxury|splurge|investment/i, value: 'premium' }
];

// ---------------------------------------------------------------------------
// Article Scanning
// ---------------------------------------------------------------------------

async function scanArticles(): Promise<ArticleData[]> {
  const articles: ArticleData[] = [];

  const patterns = [
    'src/pages/learn/*.astro',
    'src/pages/wine-pairings/*.astro',
    'src/pages/buy/*.astro'
  ];

  for (const pattern of patterns) {
    const files = await glob(pattern);

    for (const filePath of files) {
      const fileName = path.basename(filePath, '.astro');
      if (fileName === 'index') continue;

      const content = await fs.readFile(filePath, 'utf-8');
      const article = extractArticleData(filePath, content);
      if (article) {
        articles.push(article);
      }
    }
  }

  console.log(`\n📄 Scanned ${articles.length} articles`);
  return articles;
}

function extractArticleData(filePath: string, content: string): ArticleData | null {
  const fileName = path.basename(filePath, '.astro');
  const dirName = path.basename(path.dirname(filePath));

  // Extract category
  let category: 'learn' | 'buy' | 'wine-pairings';
  if (filePath.includes('/learn/')) category = 'learn';
  else if (filePath.includes('/buy/')) category = 'buy';
  else if (filePath.includes('/wine-pairings/')) category = 'wine-pairings';
  else return null;

  // Extract title from frontmatter
  const titleMatch = content.match(/title:\s*["']([^"']+)["']/);
  const title = titleMatch ? titleMatch[1] : fileName.replace(/-/g, ' ');

  // Extract description
  const descMatch = content.match(/description:\s*["']([^"']+)["']/);
  const description = descMatch ? descMatch[1] : '';

  // Extract keywords from frontmatter if present
  const keywordsMatch = content.match(/keywords:\s*\[([^\]]+)\]/);
  let keywords: string[] = [];
  if (keywordsMatch) {
    keywords = keywordsMatch[1]
      .split(',')
      .map(k => k.trim().replace(/["']/g, '').toLowerCase())
      .filter(k => k.length > 0);
  }

  // Also extract from structured_data keywords
  const schemaKeywordsMatch = content.match(/"keywords":\s*["']([^"']+)["']/);
  if (schemaKeywordsMatch) {
    const schemaKeywords = schemaKeywordsMatch[1].split(',').map(k => k.trim().toLowerCase());
    keywords = [...new Set([...keywords, ...schemaKeywords])];
  }

  const contentLower = content.toLowerCase();
  const titleLower = title.toLowerCase();
  const slugLower = fileName.toLowerCase();

  // Detect wine types
  const wineTypes = WINE_TYPES.filter(type =>
    contentLower.includes(type) || titleLower.includes(type) || slugLower.includes(type)
  );

  // Detect varieties
  const varieties = VARIETIES.filter(variety =>
    contentLower.includes(variety) || titleLower.includes(variety) || slugLower.includes(variety.replace(/ /g, '-'))
  );

  // Detect regions
  const regions = REGIONS.filter(region =>
    contentLower.includes(region) || titleLower.includes(region) || slugLower.includes(region.replace(/ /g, '-'))
  );

  // Detect food pairings
  const foodPairings = FOOD_PAIRINGS.filter(food =>
    contentLower.includes(food) || titleLower.includes(food) || slugLower.includes(food)
  );

  // Detect price points
  const pricePoints = PRICE_POINTS
    .filter(pp => pp.pattern.test(content) || pp.pattern.test(title) || pp.pattern.test(fileName))
    .map(pp => pp.value);

  // Generate topics from title and slug
  const topics: string[] = [];
  if (slugLower.includes('vs') || slugLower.includes('comparison')) topics.push('comparison');
  if (slugLower.includes('pairing') || slugLower.includes('food')) topics.push('food pairing');
  if (slugLower.includes('guide')) topics.push('guide');
  if (slugLower.includes('best')) topics.push('recommendations');
  if (slugLower.includes('under') || slugLower.includes('budget')) topics.push('budget');
  if (regions.length > 0) topics.push('wine regions');
  if (varieties.length > 0) topics.push('varietals');

  return {
    slug: fileName,
    path: filePath,
    url: `/${category}/${fileName}`,
    title,
    description,
    category,
    topics: [...new Set(topics)],
    keywords: [...new Set(keywords)],
    wineTypes: [...new Set(wineTypes)],
    regions: [...new Set(regions)],
    varieties: [...new Set(varieties)],
    pricePoints: [...new Set(pricePoints)],
    foodPairings: [...new Set(foodPairings)]
  };
}

// ---------------------------------------------------------------------------
// Related Articles Scoring
// ---------------------------------------------------------------------------

function findRelatedArticles(current: ArticleData, allArticles: ArticleData[], limit: number = 3): RelatedArticle[] {
  const scored: RelatedArticle[] = [];

  for (const article of allArticles) {
    if (article.slug === current.slug) continue;

    let score = 0;

    // Same category bonus
    if (article.category === current.category) score += 2;

    // Cross-category bonus (learn <-> wine-pairings is valuable)
    if (
      (current.category === 'learn' && article.category === 'wine-pairings') ||
      (current.category === 'wine-pairings' && article.category === 'learn')
    ) {
      score += 1;
    }

    // Shared varieties (high value)
    const sharedVarieties = article.varieties.filter(v => current.varieties.includes(v));
    score += sharedVarieties.length * 4;

    // Shared regions (high value)
    const sharedRegions = article.regions.filter(r => current.regions.includes(r));
    score += sharedRegions.length * 3;

    // Shared food pairings
    const sharedFoods = article.foodPairings.filter(f => current.foodPairings.includes(f));
    score += sharedFoods.length * 3;

    // Shared wine types
    const sharedTypes = article.wineTypes.filter(t => current.wineTypes.includes(t));
    score += sharedTypes.length * 1;

    // Shared topics
    const sharedTopics = article.topics.filter(t => current.topics.includes(t));
    score += sharedTopics.length * 2;

    // Shared keywords
    const sharedKeywords = article.keywords.filter(k => current.keywords.includes(k));
    score += sharedKeywords.length * 2;

    // Shared price points
    const sharedPrices = article.pricePoints.filter(p => current.pricePoints.includes(p));
    score += sharedPrices.length * 1;

    // Bonus for complementary content
    // If current is about a variety, link to its food pairing
    if (current.varieties.length > 0 && article.foodPairings.length > 0) {
      score += 2;
    }

    // If current is food pairing, link to wine guides
    if (current.foodPairings.length > 0 && article.topics.includes('guide')) {
      score += 2;
    }

    if (score > 0) {
      scored.push({
        title: article.title,
        slug: article.slug,
        url: article.url,
        description: article.description,
        score
      });
    }
  }

  // Sort by score and return top matches
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Article Updates
// ---------------------------------------------------------------------------

async function addRelatedArticlesToFile(article: ArticleData, relatedArticles: RelatedArticle[]): Promise<boolean> {
  if (relatedArticles.length === 0) return false;

  const content = await fs.readFile(article.path, 'utf-8');

  // Check if related articles section already exists
  if (content.includes('Related Articles') || content.includes('relatedArticles')) {
    // Check if it's empty or has content
    const emptyRelatedMatch = content.match(/<div class="grid md:grid-cols-2 gap-4">\s*<\/div>/);
    if (!emptyRelatedMatch) {
      console.log(`   ⏭️  ${article.slug} - already has related articles`);
      return false;
    }
  }

  // Generate related articles HTML
  const relatedHtml = generateRelatedArticlesHtml(relatedArticles);

  let updatedContent = content;

  // Try to find and replace empty related articles section
  const emptyRelatedPattern = /<!-- Related Articles -->\s*<div[^>]*>\s*<h3[^>]*>More[^<]*<\/h3>\s*<div class="grid md:grid-cols-2 gap-4">\s*<\/div>\s*<\/div>/;

  if (emptyRelatedPattern.test(content)) {
    updatedContent = content.replace(emptyRelatedPattern, relatedHtml);
  } else {
    // Insert before Author Bio Footer or at the end of ArticleLayout
    const authorBioPattern = /<!-- Author Bio Footer -->/;
    const articleLayoutEndPattern = /<\/ArticleLayout>/;

    if (authorBioPattern.test(content)) {
      updatedContent = content.replace(authorBioPattern, `${relatedHtml}\n\n  <!-- Author Bio Footer -->`);
    } else if (articleLayoutEndPattern.test(content)) {
      updatedContent = content.replace(articleLayoutEndPattern, `${relatedHtml}\n\n</ArticleLayout>`);
    } else {
      console.log(`   ⚠️  ${article.slug} - could not find insertion point`);
      return false;
    }
  }

  if (updatedContent !== content) {
    await fs.writeFile(article.path, updatedContent, 'utf-8');
    return true;
  }

  return false;
}

function generateRelatedArticlesHtml(relatedArticles: RelatedArticle[]): string {
  const links = relatedArticles.map(article => {
    const shortDesc = article.description.length > 80
      ? article.description.slice(0, 80) + '...'
      : article.description;

    return `      <a href="${article.url}" class="block p-4 bg-white border border-gray-200 rounded-lg hover:border-wine-300 hover:shadow-md transition-all">
        <h4 class="font-semibold text-gray-900 hover:text-wine-600">${article.title}</h4>
        <p class="text-sm text-gray-600 mt-1">${shortDesc}</p>
      </a>`;
  }).join('\n');

  return `<!-- Related Articles -->
  <div class="mt-10 pt-8 border-t border-gray-200">
    <h3 class="text-xl font-semibold mb-6">Related Articles</h3>
    <div class="grid md:grid-cols-2 gap-4">
${links}
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Registry Generation
// ---------------------------------------------------------------------------

async function generateRegistry(articles: ArticleData[]): Promise<void> {
  const registryContent = `/**
 * Auto-generated Article Registry
 * Generated: ${new Date().toISOString()}
 * Total Articles: ${articles.length}
 */

export interface ArticleEntry {
  slug: string;
  url: string;
  title: string;
  description: string;
  category: 'learn' | 'buy' | 'wine-pairings';
  topics: string[];
  keywords: string[];
  wineTypes: string[];
  regions: string[];
  varieties: string[];
  pricePoints: string[];
  foodPairings: string[];
}

export const articleRegistry: ArticleEntry[] = ${JSON.stringify(articles.map(a => ({
    slug: a.slug,
    url: a.url,
    title: a.title,
    description: a.description,
    category: a.category,
    topics: a.topics,
    keywords: a.keywords,
    wineTypes: a.wineTypes,
    regions: a.regions,
    varieties: a.varieties,
    pricePoints: a.pricePoints,
    foodPairings: a.foodPairings
  })), null, 2)};

/**
 * Find related articles for a given slug
 */
export function findRelatedArticles(currentSlug: string, limit: number = 3): ArticleEntry[] {
  const current = articleRegistry.find(a => a.slug === currentSlug);
  if (!current) return [];

  const scored: { article: ArticleEntry; score: number }[] = [];

  for (const article of articleRegistry) {
    if (article.slug === currentSlug) continue;

    let score = 0;

    if (article.category === current.category) score += 2;
    score += article.varieties.filter(v => current.varieties.includes(v)).length * 4;
    score += article.regions.filter(r => current.regions.includes(r)).length * 3;
    score += article.foodPairings.filter(f => current.foodPairings.includes(f)).length * 3;
    score += article.wineTypes.filter(t => current.wineTypes.includes(t)).length * 1;
    score += article.topics.filter(t => current.topics.includes(t)).length * 2;
    score += article.keywords.filter(k => current.keywords.includes(k)).length * 2;

    if (score > 0) scored.push({ article, score });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.article);
}
`;

  await fs.writeFile('src/lib/article-registry.ts', registryContent, 'utf-8');
  console.log('\n📝 Generated src/lib/article-registry.ts');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🔗 Internal Linking System\n');
  console.log('═══════════════════════════════════════');

  // Scan all articles
  console.log('\n📂 Scanning articles...');
  const articles = await scanArticles();

  // Generate fresh registry
  console.log('\n📝 Generating article registry...');
  await generateRegistry(articles);

  // Add related articles to each file
  console.log('\n🔗 Adding related articles to files...');
  let updated = 0;
  let skipped = 0;

  for (const article of articles) {
    const related = findRelatedArticles(article, articles, 3);

    if (related.length > 0) {
      const wasUpdated = await addRelatedArticlesToFile(article, related);
      if (wasUpdated) {
        console.log(`   ✅ ${article.slug} → ${related.map(r => r.slug).join(', ')}`);
        updated++;
      } else {
        skipped++;
      }
    } else {
      console.log(`   ⚠️  ${article.slug} - no related articles found`);
      skipped++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📋 SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Updated: ${updated}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`📊 Total: ${articles.length}`);
  console.log('\n✅ Internal linking complete!');
}

main().catch(console.error);
