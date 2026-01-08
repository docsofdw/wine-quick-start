/**
 * Internal Linking System for Wine Quick Start
 *
 * Provides:
 * 1. Article registry with topics and keywords
 * 2. Auto-linking within content
 * 3. Related articles suggestions
 * 4. Backlink management for new articles
 */

import fs from 'fs/promises';
import path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArticleEntry {
  slug: string;
  path: string;
  url: string;
  title: string;
  category: 'learn' | 'buy' | 'wine-pairings';
  topics: string[];
  keywords: string[];
  wineTypes: string[];
  regions: string[];
  varieties: string[];
  pricePoints: string[];
  lastUpdated: string;
}

export interface LinkSuggestion {
  text: string;
  url: string;
  relevanceScore: number;
}

// ---------------------------------------------------------------------------
// Article Registry
// ---------------------------------------------------------------------------

/**
 * Master registry of all articles with their topics and keywords
 * This should be regenerated when articles change
 */
export const articleRegistry: ArticleEntry[] = [
  // Learn articles
  {
    slug: 'bordeaux-wine-guide',
    path: '/src/pages/learn/bordeaux-wine-guide.astro',
    url: '/learn/bordeaux-wine-guide',
    title: 'Bordeaux Wine Guide',
    category: 'learn',
    topics: ['wine regions', 'french wine', 'bordeaux'],
    keywords: ['bordeaux', 'french wine', 'left bank', 'right bank', 'medoc', 'saint-emilion'],
    wineTypes: ['red'],
    regions: ['bordeaux', 'france'],
    varieties: ['cabernet sauvignon', 'merlot', 'cabernet franc'],
    pricePoints: ['premium', 'luxury'],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'natural-wine-recommendations',
    path: '/src/pages/learn/natural-wine-recommendations.astro',
    url: '/learn/natural-wine-recommendations',
    title: 'Natural Wine Recommendations',
    category: 'learn',
    topics: ['natural wine', 'recommendations', 'buying guide'],
    keywords: ['natural wine', 'organic wine', 'biodynamic', 'low intervention'],
    wineTypes: ['red', 'white', 'orange', 'sparkling'],
    regions: [],
    varieties: [],
    pricePoints: ['budget', 'mid-range'],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'cheap-natural-wine',
    path: '/src/pages/learn/cheap-natural-wine.astro',
    url: '/learn/cheap-natural-wine',
    title: 'Cheap Natural Wine Guide',
    category: 'learn',
    topics: ['natural wine', 'budget wine', 'value'],
    keywords: ['cheap natural wine', 'affordable natural wine', 'budget organic'],
    wineTypes: ['red', 'white', 'orange'],
    regions: [],
    varieties: [],
    pricePoints: ['budget', 'under 20'],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'natural-wine-under-20',
    path: '/src/pages/learn/natural-wine-under-20.astro',
    url: '/learn/natural-wine-under-20',
    title: 'Natural Wine Under $20',
    category: 'learn',
    topics: ['natural wine', 'budget wine', 'value'],
    keywords: ['natural wine under 20', 'cheap natural wine', 'affordable'],
    wineTypes: ['red', 'white', 'orange'],
    regions: [],
    varieties: [],
    pricePoints: ['under 20', 'budget'],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'natural-wine-under-50',
    path: '/src/pages/learn/natural-wine-under-50.astro',
    url: '/learn/natural-wine-under-50',
    title: 'Natural Wine Under $50',
    category: 'learn',
    topics: ['natural wine', 'mid-range wine'],
    keywords: ['natural wine under 50', 'premium natural wine'],
    wineTypes: ['red', 'white', 'orange'],
    regions: [],
    varieties: [],
    pricePoints: ['under 50', 'mid-range'],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'cheap-orange-wine',
    path: '/src/pages/learn/cheap-orange-wine.astro',
    url: '/learn/cheap-orange-wine',
    title: 'Cheap Orange Wine Guide',
    category: 'learn',
    topics: ['orange wine', 'budget wine', 'skin contact'],
    keywords: ['cheap orange wine', 'affordable orange wine', 'budget skin contact'],
    wineTypes: ['orange'],
    regions: [],
    varieties: ['pinot grigio', 'gewurztraminer', 'ribolla gialla'],
    pricePoints: ['budget', 'under 20'],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'orange-wine-under-50',
    path: '/src/pages/learn/orange-wine-under-50.astro',
    url: '/learn/orange-wine-under-50',
    title: 'Orange Wine Under $50',
    category: 'learn',
    topics: ['orange wine', 'skin contact', 'mid-range'],
    keywords: ['orange wine under 50', 'premium orange wine'],
    wineTypes: ['orange'],
    regions: ['georgia', 'slovenia', 'italy'],
    varieties: ['rkatsiteli', 'ribolla gialla'],
    pricePoints: ['under 50', 'mid-range'],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'under-20-orange-wine',
    path: '/src/pages/learn/under-20-orange-wine.astro',
    url: '/learn/under-20-orange-wine',
    title: 'Orange Wine Under $20',
    category: 'learn',
    topics: ['orange wine', 'budget wine', 'skin contact'],
    keywords: ['orange wine under 20', 'cheap orange wine', 'affordable'],
    wineTypes: ['orange'],
    regions: [],
    varieties: [],
    pricePoints: ['under 20', 'budget'],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'best-natural-wine-for-beginners',
    path: '/src/pages/learn/best-natural-wine-for-beginners.astro',
    url: '/learn/best-natural-wine-for-beginners',
    title: 'Best Natural Wine for Beginners',
    category: 'learn',
    topics: ['natural wine', 'beginners', 'introduction'],
    keywords: ['natural wine beginners', 'first natural wine', 'natural wine intro'],
    wineTypes: ['red', 'white', 'orange'],
    regions: [],
    varieties: [],
    pricePoints: ['budget', 'mid-range'],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'natural-wine-review',
    path: '/src/pages/learn/natural-wine-review.astro',
    url: '/learn/natural-wine-review',
    title: 'Natural Wine Review',
    category: 'learn',
    topics: ['natural wine', 'reviews', 'tasting notes'],
    keywords: ['natural wine review', 'natural wine ratings', 'organic wine review'],
    wineTypes: ['red', 'white', 'orange'],
    regions: [],
    varieties: [],
    pricePoints: [],
    lastUpdated: new Date().toISOString()
  },

  // Buy articles
  {
    slug: 'natural-wine-price',
    path: '/src/pages/buy/natural-wine-price.astro',
    url: '/buy/natural-wine-price',
    title: 'Natural Wine Prices',
    category: 'buy',
    topics: ['natural wine', 'pricing', 'buying guide'],
    keywords: ['natural wine price', 'cost of natural wine', 'natural wine value'],
    wineTypes: ['red', 'white', 'orange'],
    regions: [],
    varieties: [],
    pricePoints: ['budget', 'mid-range', 'premium'],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'price-natural-wine',
    path: '/src/pages/buy/price-natural-wine.astro',
    url: '/buy/price-natural-wine',
    title: 'Price Guide for Natural Wine',
    category: 'buy',
    topics: ['natural wine', 'pricing', 'value'],
    keywords: ['price natural wine', 'natural wine cost', 'buying natural wine'],
    wineTypes: ['red', 'white', 'orange'],
    regions: [],
    varieties: [],
    pricePoints: ['budget', 'mid-range', 'premium'],
    lastUpdated: new Date().toISOString()
  },

  // Wine Pairings articles
  {
    slug: 'wine-pairing',
    path: '/src/pages/wine-pairings/wine-pairing.astro',
    url: '/wine-pairings/wine-pairing',
    title: 'Wine Pairing Guide',
    category: 'wine-pairings',
    topics: ['food pairing', 'wine pairing', 'fundamentals'],
    keywords: ['wine pairing', 'food and wine', 'pairing guide', 'wine with food'],
    wineTypes: ['red', 'white', 'sparkling'],
    regions: [],
    varieties: [],
    pricePoints: [],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'pinot-noir',
    path: '/src/pages/wine-pairings/pinot-noir.astro',
    url: '/wine-pairings/pinot-noir',
    title: 'Pinot Noir Guide',
    category: 'wine-pairings',
    topics: ['pinot noir', 'red wine', 'burgundy', 'oregon'],
    keywords: ['pinot noir', 'pinot noir pairing', 'burgundy wine', 'oregon pinot'],
    wineTypes: ['red'],
    regions: ['burgundy', 'oregon', 'california', 'new zealand'],
    varieties: ['pinot noir'],
    pricePoints: ['mid-range', 'premium'],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'chardonnay',
    path: '/src/pages/wine-pairings/chardonnay.astro',
    url: '/wine-pairings/chardonnay',
    title: 'Chardonnay Guide',
    category: 'wine-pairings',
    topics: ['chardonnay', 'white wine', 'burgundy', 'california'],
    keywords: ['chardonnay', 'chardonnay pairing', 'white burgundy', 'oaked chardonnay'],
    wineTypes: ['white'],
    regions: ['burgundy', 'california', 'australia'],
    varieties: ['chardonnay'],
    pricePoints: ['budget', 'mid-range', 'premium'],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'cabernet-sauvignon',
    path: '/src/pages/wine-pairings/cabernet-sauvignon.astro',
    url: '/wine-pairings/cabernet-sauvignon',
    title: 'Cabernet Sauvignon Guide',
    category: 'wine-pairings',
    topics: ['cabernet sauvignon', 'red wine', 'napa', 'bordeaux'],
    keywords: ['cabernet sauvignon', 'cabernet pairing', 'napa cab', 'bordeaux red'],
    wineTypes: ['red'],
    regions: ['napa valley', 'bordeaux', 'california', 'washington'],
    varieties: ['cabernet sauvignon'],
    pricePoints: ['mid-range', 'premium', 'luxury'],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'natural-wine',
    path: '/src/pages/wine-pairings/natural-wine.astro',
    url: '/wine-pairings/natural-wine',
    title: 'Natural Wine Pairing Guide',
    category: 'wine-pairings',
    topics: ['natural wine', 'food pairing', 'organic'],
    keywords: ['natural wine pairing', 'organic wine food', 'biodynamic pairing'],
    wineTypes: ['red', 'white', 'orange'],
    regions: [],
    varieties: [],
    pricePoints: [],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'best-wine-with-salmon',
    path: '/src/pages/wine-pairings/best-wine-with-salmon.astro',
    url: '/wine-pairings/best-wine-with-salmon',
    title: 'Best Wine with Salmon',
    category: 'wine-pairings',
    topics: ['salmon', 'fish pairing', 'seafood'],
    keywords: ['wine with salmon', 'salmon pairing', 'fish wine', 'seafood wine'],
    wineTypes: ['white', 'red', 'rosé'],
    regions: [],
    varieties: ['pinot noir', 'chardonnay', 'sauvignon blanc'],
    pricePoints: [],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'wine-pairing-mushroom-risotto',
    path: '/src/pages/wine-pairings/wine-pairing-mushroom-risotto.astro',
    url: '/wine-pairings/wine-pairing-mushroom-risotto',
    title: 'Wine Pairing for Mushroom Risotto',
    category: 'wine-pairings',
    topics: ['mushroom', 'risotto', 'italian food', 'vegetarian'],
    keywords: ['mushroom risotto wine', 'risotto pairing', 'earthy wine'],
    wineTypes: ['red', 'white'],
    regions: ['burgundy', 'piedmont', 'oregon'],
    varieties: ['pinot noir', 'nebbiolo', 'chardonnay'],
    pricePoints: [],
    lastUpdated: new Date().toISOString()
  },
  {
    slug: 'pinot-noir-food-pairing',
    path: '/src/pages/wine-pairings/pinot-noir-food-pairing.astro',
    url: '/wine-pairings/pinot-noir-food-pairing',
    title: 'Pinot Noir Food Pairing',
    category: 'wine-pairings',
    topics: ['pinot noir', 'food pairing', 'red wine'],
    keywords: ['pinot noir food', 'pinot noir pairing', 'what to eat with pinot noir'],
    wineTypes: ['red'],
    regions: ['burgundy', 'oregon', 'california'],
    varieties: ['pinot noir'],
    pricePoints: [],
    lastUpdated: new Date().toISOString()
  },
];

// ---------------------------------------------------------------------------
// Keyword to Article Mapping (for auto-linking)
// ---------------------------------------------------------------------------

interface KeywordLink {
  keyword: string;
  variations: string[];
  article: ArticleEntry;
  priority: number; // Higher = link this first when multiple matches
}

/**
 * Build keyword links from registry
 */
export function buildKeywordLinks(): KeywordLink[] {
  const links: KeywordLink[] = [];

  for (const article of articleRegistry) {
    // Primary keywords get high priority
    for (const keyword of article.keywords) {
      links.push({
        keyword: keyword.toLowerCase(),
        variations: generateVariations(keyword),
        article,
        priority: 10
      });
    }

    // Topics get medium priority
    for (const topic of article.topics) {
      links.push({
        keyword: topic.toLowerCase(),
        variations: generateVariations(topic),
        article,
        priority: 5
      });
    }

    // Varieties get high priority (specific content)
    for (const variety of article.varieties) {
      links.push({
        keyword: variety.toLowerCase(),
        variations: generateVariations(variety),
        article,
        priority: 8
      });
    }

    // Regions get medium-high priority
    for (const region of article.regions) {
      links.push({
        keyword: region.toLowerCase(),
        variations: generateVariations(region),
        article,
        priority: 7
      });
    }
  }

  // Sort by priority (highest first)
  return links.sort((a, b) => b.priority - a.priority);
}

/**
 * Generate common variations of a keyword
 */
function generateVariations(keyword: string): string[] {
  const variations = [keyword.toLowerCase()];

  // Capitalize first letter
  variations.push(keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase());

  // All caps for short words
  if (keyword.length <= 4) {
    variations.push(keyword.toUpperCase());
  }

  // With/without common suffixes
  if (keyword.endsWith('s')) {
    variations.push(keyword.slice(0, -1));
  } else {
    variations.push(keyword + 's');
  }

  return [...new Set(variations)];
}

// ---------------------------------------------------------------------------
// Auto-Linking Functions
// ---------------------------------------------------------------------------

/**
 * Add internal links to content automatically
 * @param content - The article content (markdown/HTML)
 * @param currentSlug - The current article's slug (to avoid self-linking)
 * @param maxLinks - Maximum number of links to add (default 5)
 */
export function autoLinkContent(
  content: string,
  currentSlug: string,
  maxLinks: number = 5
): string {
  const keywordLinks = buildKeywordLinks();
  const linkedKeywords = new Set<string>();
  let linksAdded = 0;
  let result = content;

  for (const link of keywordLinks) {
    if (linksAdded >= maxLinks) break;
    if (link.article.slug === currentSlug) continue;
    if (linkedKeywords.has(link.keyword)) continue;

    for (const variation of link.variations) {
      // Only match whole words, not already in a link
      const regex = new RegExp(
        `(?<![\\w/"])\\b(${escapeRegex(variation)})\\b(?![\\w"]*</a>)(?![^<]*>)`,
        'gi'
      );

      if (regex.test(result)) {
        // Only replace first occurrence
        result = result.replace(regex, (match) => {
          linksAdded++;
          linkedKeywords.add(link.keyword);
          return `<a href="${link.article.url}" class="internal-link">${match}</a>`;
        });
        break;
      }
    }
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Related Articles
// ---------------------------------------------------------------------------

/**
 * Find related articles based on shared topics, keywords, regions, varieties
 */
export function findRelatedArticles(
  currentSlug: string,
  limit: number = 4
): ArticleEntry[] {
  const current = articleRegistry.find(a => a.slug === currentSlug);
  if (!current) return [];

  const scored: { article: ArticleEntry; score: number }[] = [];

  for (const article of articleRegistry) {
    if (article.slug === currentSlug) continue;

    let score = 0;

    // Same category bonus
    if (article.category === current.category) score += 2;

    // Shared topics
    const sharedTopics = article.topics.filter(t => current.topics.includes(t));
    score += sharedTopics.length * 3;

    // Shared keywords
    const sharedKeywords = article.keywords.filter(k => current.keywords.includes(k));
    score += sharedKeywords.length * 2;

    // Shared wine types
    const sharedTypes = article.wineTypes.filter(t => current.wineTypes.includes(t));
    score += sharedTypes.length * 1;

    // Shared regions
    const sharedRegions = article.regions.filter(r => current.regions.includes(r));
    score += sharedRegions.length * 2;

    // Shared varieties
    const sharedVarieties = article.varieties.filter(v => current.varieties.includes(v));
    score += sharedVarieties.length * 3;

    // Shared price points
    const sharedPrices = article.pricePoints.filter(p => current.pricePoints.includes(p));
    score += sharedPrices.length * 1;

    if (score > 0) {
      scored.push({ article, score });
    }
  }

  // Sort by score and return top matches
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.article);
}

// ---------------------------------------------------------------------------
// Backlink Management
// ---------------------------------------------------------------------------

/**
 * Find articles that should link TO a new article
 * These are articles that mention topics the new article covers
 */
export function findBacklinkCandidates(newArticle: ArticleEntry): ArticleEntry[] {
  const candidates: ArticleEntry[] = [];

  for (const article of articleRegistry) {
    if (article.slug === newArticle.slug) continue;

    // Check if the existing article's content would benefit from linking to new article
    const relevantKeywords = [
      ...newArticle.keywords,
      ...newArticle.topics,
      ...newArticle.varieties,
      ...newArticle.regions
    ];

    // If the existing article shares topics but doesn't cover them as deeply
    const overlapScore = relevantKeywords.filter(k =>
      article.keywords.includes(k) || article.topics.includes(k)
    ).length;

    if (overlapScore >= 2) {
      candidates.push(article);
    }
  }

  return candidates;
}

/**
 * Generate a "See Also" link block for an article
 */
export function generateSeeAlsoLinks(articleSlug: string): string {
  const related = findRelatedArticles(articleSlug, 3);
  if (related.length === 0) return '';

  return related.map(article =>
    `- [${article.title}](${article.url})`
  ).join('\n');
}

// ---------------------------------------------------------------------------
// Content Enhancement
// ---------------------------------------------------------------------------

/**
 * Generate contextual internal links for insertion into content
 */
export function generateContextualLinks(
  keyword: string,
  currentSlug: string,
  maxLinks: number = 3
): LinkSuggestion[] {
  const suggestions: LinkSuggestion[] = [];
  const keywordLower = keyword.toLowerCase();

  for (const article of articleRegistry) {
    if (article.slug === currentSlug) continue;

    let relevance = 0;

    // Direct keyword match
    if (article.keywords.some(k => k.includes(keywordLower) || keywordLower.includes(k))) {
      relevance += 10;
    }

    // Topic match
    if (article.topics.some(t => t.includes(keywordLower) || keywordLower.includes(t))) {
      relevance += 5;
    }

    // Variety match
    if (article.varieties.some(v => keywordLower.includes(v))) {
      relevance += 8;
    }

    // Region match
    if (article.regions.some(r => keywordLower.includes(r))) {
      relevance += 6;
    }

    if (relevance > 0) {
      suggestions.push({
        text: article.title,
        url: article.url,
        relevanceScore: relevance
      });
    }
  }

  return suggestions
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxLinks);
}

// ---------------------------------------------------------------------------
// Registry Management
// ---------------------------------------------------------------------------

/**
 * Add a new article to the registry
 */
export function registerArticle(article: ArticleEntry): void {
  const existing = articleRegistry.findIndex(a => a.slug === article.slug);
  if (existing >= 0) {
    articleRegistry[existing] = article;
  } else {
    articleRegistry.push(article);
  }
}

/**
 * Extract article metadata from content for registration
 */
export function extractArticleMetadata(
  slug: string,
  content: string,
  category: 'learn' | 'buy' | 'wine-pairings'
): Partial<ArticleEntry> {
  const metadata: Partial<ArticleEntry> = {
    slug,
    category,
    topics: [],
    keywords: [],
    wineTypes: [],
    regions: [],
    varieties: [],
    pricePoints: [],
    lastUpdated: new Date().toISOString()
  };

  const contentLower = content.toLowerCase();

  // Detect wine types
  if (contentLower.includes('red wine') || contentLower.includes('red blend')) {
    metadata.wineTypes!.push('red');
  }
  if (contentLower.includes('white wine') || contentLower.includes('chardonnay') || contentLower.includes('sauvignon blanc')) {
    metadata.wineTypes!.push('white');
  }
  if (contentLower.includes('orange wine') || contentLower.includes('skin contact')) {
    metadata.wineTypes!.push('orange');
  }
  if (contentLower.includes('sparkling') || contentLower.includes('champagne')) {
    metadata.wineTypes!.push('sparkling');
  }
  if (contentLower.includes('rosé') || contentLower.includes('rose wine')) {
    metadata.wineTypes!.push('rosé');
  }

  // Detect varieties
  const varietyPatterns = [
    'pinot noir', 'cabernet sauvignon', 'merlot', 'chardonnay', 'sauvignon blanc',
    'riesling', 'syrah', 'shiraz', 'zinfandel', 'malbec', 'tempranillo',
    'sangiovese', 'nebbiolo', 'grenache', 'pinot grigio', 'gewurztraminer'
  ];
  for (const variety of varietyPatterns) {
    if (contentLower.includes(variety)) {
      metadata.varieties!.push(variety);
    }
  }

  // Detect regions
  const regionPatterns = [
    'bordeaux', 'burgundy', 'champagne', 'rhône', 'loire', 'alsace',
    'napa valley', 'sonoma', 'california', 'oregon', 'washington',
    'piedmont', 'tuscany', 'sicily', 'veneto',
    'rioja', 'priorat', 'ribera del duero',
    'barossa', 'marlborough', 'mendoza'
  ];
  for (const region of regionPatterns) {
    if (contentLower.includes(region)) {
      metadata.regions!.push(region);
    }
  }

  // Detect price points
  if (contentLower.includes('under $20') || contentLower.includes('under 20') || contentLower.includes('budget')) {
    metadata.pricePoints!.push('under 20');
    metadata.pricePoints!.push('budget');
  }
  if (contentLower.includes('under $50') || contentLower.includes('under 50')) {
    metadata.pricePoints!.push('under 50');
    metadata.pricePoints!.push('mid-range');
  }
  if (contentLower.includes('premium') || contentLower.includes('luxury')) {
    metadata.pricePoints!.push('premium');
  }

  return metadata;
}
