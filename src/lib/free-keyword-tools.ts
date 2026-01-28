/**
 * Free Keyword Research Tools
 * Uses Google Autocomplete, Related Searches, and other free APIs
 * No paid APIs required!
 */

export interface KeywordSuggestion {
  keyword: string;
  source: 'autocomplete' | 'related' | 'expansion' | 'trend';
  estimatedVolume?: 'high' | 'medium' | 'low';
}

export interface KeywordWithMetrics {
  keyword: string;
  estimatedVolume: 'high' | 'medium' | 'low';
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  priority: number;
  sources: string[];
}

// High-volume wine seed keywords (proven search terms)
export const HIGH_VOLUME_WINE_SEEDS = [
  // Core wine terms (very high volume)
  'wine', 'red wine', 'white wine', 'rosé wine', 'sparkling wine',
  'wine glasses', 'wine opener', 'wine rack', 'wine refrigerator',

  // Food pairings (extremely high volume)
  'wine with steak', 'wine with salmon', 'wine with chicken',
  'wine with pasta', 'wine with pizza', 'wine with cheese',
  'wine with turkey', 'wine with seafood', 'wine with beef',
  'wine with lamb', 'wine with pork', 'wine with fish',
  'wine and cheese pairing', 'wine and chocolate',

  // Budget searches (very high volume, high intent)
  'best wine under 20', 'best wine under 15', 'best wine under 30',
  'cheap wine', 'good cheap wine', 'best value wine',
  'affordable wine', 'budget wine', 'wine deals',

  // Occasion-based (seasonal spikes, high intent)
  'wine for thanksgiving', 'wine for christmas', 'wine for wedding',
  'wine for date night', 'wine gift', 'wine for dinner party',
  'wine for birthday', 'wine for anniversary', 'wine for gift',

  // Beginner searches (high volume, easy to rank)
  'wine for beginners', 'how to choose wine', 'wine guide',
  'wine basics', 'wine 101', 'learn about wine',
  'types of wine', 'wine types', 'different types of wine',

  // Popular varietals
  'cabernet sauvignon', 'pinot noir', 'merlot', 'chardonnay',
  'sauvignon blanc', 'pinot grigio', 'riesling', 'malbec',
  'zinfandel', 'syrah', 'shiraz', 'prosecco', 'champagne',

  // Popular regions
  'napa valley wine', 'french wine', 'italian wine', 'spanish wine',
  'california wine', 'oregon wine', 'washington wine',
  'bordeaux wine', 'burgundy wine', 'tuscany wine', 'rioja wine',

  // Comparison searches (featured snippet opportunities)
  'pinot noir vs cabernet', 'chardonnay vs sauvignon blanc',
  'prosecco vs champagne', 'red vs white wine',
  'merlot vs cabernet', 'pinot grigio vs chardonnay',

  // Health/lifestyle
  'low sugar wine', 'low calorie wine', 'organic wine',
  'natural wine', 'vegan wine', 'keto wine', 'dry wine',
  'sweet wine', 'light wine', 'smooth wine',

  // Serving & storage
  'wine temperature', 'how to store wine', 'wine storage',
  'how long does wine last', 'wine serving temperature',
  'how to open wine', 'wine decanting',
];

// Wine-related term patterns for filtering
const WINE_PATTERNS = [
  /wine/i, /cabernet/i, /merlot/i, /chardonnay/i, /pinot/i,
  /sauvignon/i, /riesling/i, /malbec/i, /shiraz/i, /syrah/i,
  /prosecco/i, /champagne/i, /bordeaux/i, /burgundy/i,
  /sommelier/i, /vineyard/i, /winery/i, /vintage/i,
  /pairing/i, /varietal/i, /terroir/i,
];

/**
 * Check if a keyword is wine-related
 */
export function isWineRelated(keyword: string): boolean {
  return WINE_PATTERNS.some(pattern => pattern.test(keyword));
}

/**
 * Get Google Autocomplete suggestions (FREE)
 * Uses the public autocomplete API that powers Google search
 */
export async function getGoogleAutocompleteSuggestions(
  seed: string,
  suffixes: string[] = ['', 'a', 'b', 'c', 'for', 'with', 'vs', 'best', 'how to', 'what is']
): Promise<KeywordSuggestion[]> {
  const suggestions: KeywordSuggestion[] = [];

  for (const suffix of suffixes) {
    const query = suffix ? `${seed} ${suffix}` : seed;
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const results = data[1] || [];

        for (const result of results) {
          if (result && result.length > 5 && result.length < 80) {
            suggestions.push({
              keyword: result.toLowerCase().trim(),
              source: 'autocomplete',
              estimatedVolume: 'medium', // Autocomplete = decent volume
            });
          }
        }
      }
    } catch (err) {
      // Silently continue on error
    }

    // Rate limit: 200ms between requests
    await new Promise(r => setTimeout(r, 200));
  }

  return suggestions;
}

/**
 * Expand keywords with wine-specific modifiers
 */
export function expandWithModifiers(seeds: string[]): KeywordSuggestion[] {
  const modifiers = {
    prefix: [
      'best', 'top', 'good', 'cheap', 'affordable', 'premium',
      'how to choose', 'what is', 'guide to', 'types of',
    ],
    suffix: [
      'guide', 'pairing', 'pairings', 'recommendations', 'review',
      'for beginners', 'for cooking', 'for gift', 'price',
      'under 20', 'under 30', 'under 50', 'vs',
      'taste', 'flavor', 'temperature', 'storage',
    ],
    questions: [
      'what wine goes with', 'what is the best', 'how to serve',
      'how long does', 'is', 'can you',
    ],
  };

  const expanded: KeywordSuggestion[] = [];

  for (const seed of seeds) {
    // Add base term
    expanded.push({ keyword: seed, source: 'expansion', estimatedVolume: 'medium' });

    // Add prefix variations
    for (const prefix of modifiers.prefix) {
      expanded.push({
        keyword: `${prefix} ${seed}`,
        source: 'expansion',
        estimatedVolume: prefix === 'best' ? 'high' : 'medium',
      });
    }

    // Add suffix variations
    for (const suffix of modifiers.suffix) {
      expanded.push({
        keyword: `${seed} ${suffix}`,
        source: 'expansion',
        estimatedVolume: suffix === 'pairing' ? 'high' : 'medium',
      });
    }
  }

  return expanded;
}

/**
 * Estimate search volume based on keyword characteristics
 * This is a heuristic since we don't have real volume data
 */
export function estimateSearchVolume(keyword: string): 'high' | 'medium' | 'low' {
  const kw = keyword.toLowerCase();

  // High volume indicators
  const highVolumePatterns = [
    /^best\s/,                    // "best X" searches are huge
    /wine with (steak|chicken|salmon|pasta|pizza|cheese)/,
    /wine for (thanksgiving|christmas|wedding|beginners)/,
    /under \$?\d+/,               // Price searches
    /vs\s/,                       // Comparison searches
    /^(red|white|rosé)\s*wine$/,  // Core terms
    /how to (choose|pick|select|serve|store)/,
    /wine (glass|glasses|opener|rack|fridge|refrigerator)/,
  ];

  if (highVolumePatterns.some(p => p.test(kw))) {
    return 'high';
  }

  // Low volume indicators
  const lowVolumePatterns = [
    /\d{4}\s*vintage/,           // Specific vintages
    /specific.*producer/,
    /.{60,}/,                    // Very long queries
  ];

  if (lowVolumePatterns.some(p => p.test(kw))) {
    return 'low';
  }

  // Word count heuristic: 2-4 words often have best volume
  const wordCount = kw.split(/\s+/).length;
  if (wordCount >= 2 && wordCount <= 4) {
    return 'medium';
  }

  return 'low';
}

/**
 * Estimate keyword difficulty based on characteristics
 */
export function estimateDifficulty(keyword: string): 'easy' | 'medium' | 'hard' {
  const kw = keyword.toLowerCase();

  // Hard: dominated by big brands
  const hardPatterns = [
    /^wine$/,
    /^red wine$/,
    /^white wine$/,
    /^champagne$/,
    /wine glass(es)?$/,
    /^buy wine/,
  ];

  if (hardPatterns.some(p => p.test(kw))) {
    return 'hard';
  }

  // Easy: long-tail, specific queries
  const wordCount = kw.split(/\s+/).length;
  if (wordCount >= 4) {
    return 'easy';
  }

  // Easy: specific pairings, comparisons
  const easyPatterns = [
    /wine (with|for|and)\s+\w+\s+\w+/,  // "wine with X Y"
    /\w+\s+vs\s+\w+/,                    // "X vs Y"
    /under \$?\d+/,                      // Price-specific
    /for beginners/,
    /how to/,
  ];

  if (easyPatterns.some(p => p.test(kw))) {
    return 'easy';
  }

  return 'medium';
}

/**
 * Determine search intent
 */
export function determineIntent(keyword: string): 'informational' | 'commercial' | 'transactional' | 'navigational' {
  const kw = keyword.toLowerCase();

  // Transactional: ready to buy
  if (/buy|shop|order|price|deal|sale|discount|cheap|affordable|under \$/.test(kw)) {
    return 'transactional';
  }

  // Commercial: researching before buying
  if (/best|top|review|recommend|vs|compare|rating/.test(kw)) {
    return 'commercial';
  }

  // Navigational: looking for specific thing
  if (/^(the\s)?\w+\s(winery|vineyard|website|store)$/.test(kw)) {
    return 'navigational';
  }

  // Informational: learning
  return 'informational';
}

/**
 * Calculate priority score (1-10)
 * Higher = better opportunity
 */
export function calculatePriority(keyword: string): number {
  const volume = estimateSearchVolume(keyword);
  const difficulty = estimateDifficulty(keyword);
  const intent = determineIntent(keyword);

  let priority = 5; // Base score

  // Volume scoring
  if (volume === 'high') priority += 2.5;
  else if (volume === 'medium') priority += 1;
  else priority -= 0.5;

  // Difficulty scoring (easier = better for new site)
  if (difficulty === 'easy') priority += 2;
  else if (difficulty === 'medium') priority += 0.5;
  else priority -= 1;

  // Intent scoring
  if (intent === 'commercial') priority += 1.5;  // High conversion potential
  else if (intent === 'transactional') priority += 1;
  else if (intent === 'informational') priority += 0.5;

  // Wine-specific bonuses
  const kw = keyword.toLowerCase();

  // Food pairing bonus (very popular, good for affiliates)
  if (/pairing|with\s+(steak|chicken|salmon|fish|pasta|cheese)/.test(kw)) {
    priority += 1;
  }

  // Budget search bonus (high intent, good conversion)
  if (/under\s+\$?\d+|cheap|affordable|budget|value/.test(kw)) {
    priority += 1;
  }

  // Comparison bonus (featured snippet opportunity)
  if (/\bvs\b|versus|compared to|difference between/.test(kw)) {
    priority += 0.5;
  }

  // Long-tail bonus (easier to rank, specific intent)
  const wordCount = kw.split(/\s+/).length;
  if (wordCount >= 3 && wordCount <= 5) {
    priority += 0.5;
  }

  return Math.min(10, Math.max(1, Math.round(priority)));
}

/**
 * Process keywords and add metrics
 */
export function processKeywords(suggestions: KeywordSuggestion[]): KeywordWithMetrics[] {
  // Deduplicate
  const uniqueMap = new Map<string, KeywordSuggestion>();
  for (const s of suggestions) {
    const key = s.keyword.toLowerCase().trim();
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, s);
    }
  }

  const processed: KeywordWithMetrics[] = [];

  for (const [keyword, suggestion] of uniqueMap) {
    // Filter out non-wine keywords
    if (!isWineRelated(keyword) && !keyword.includes('pairing')) {
      continue;
    }

    // Filter out too short or too long
    if (keyword.length < 8 || keyword.length > 70) {
      continue;
    }

    processed.push({
      keyword,
      estimatedVolume: estimateSearchVolume(keyword),
      estimatedDifficulty: estimateDifficulty(keyword),
      intent: determineIntent(keyword),
      priority: calculatePriority(keyword),
      sources: [suggestion.source],
    });
  }

  // Sort by priority
  return processed.sort((a, b) => b.priority - a.priority);
}

/**
 * Main function: Run full free keyword research
 */
export async function runFreeKeywordResearch(
  customSeeds: string[] = []
): Promise<KeywordWithMetrics[]> {
  console.log('🔍 Starting FREE keyword research...\n');

  const allSuggestions: KeywordSuggestion[] = [];
  const seeds = [...HIGH_VOLUME_WINE_SEEDS, ...customSeeds];

  // Step 1: Get Google Autocomplete suggestions
  console.log('📝 Getting Google Autocomplete suggestions...');
  const seedsToQuery = seeds.slice(0, 30); // Limit to avoid rate limiting

  for (let i = 0; i < seedsToQuery.length; i++) {
    const seed = seedsToQuery[i];
    process.stdout.write(`   [${i + 1}/${seedsToQuery.length}] ${seed}...`);

    const suggestions = await getGoogleAutocompleteSuggestions(seed);
    allSuggestions.push(...suggestions);

    console.log(` found ${suggestions.length}`);
  }

  // Step 2: Expand with modifiers
  console.log('\n📝 Expanding with wine modifiers...');
  const expanded = expandWithModifiers(seeds.slice(0, 50));
  allSuggestions.push(...expanded);
  console.log(`   Added ${expanded.length} expanded keywords`);

  // Step 3: Process and score
  console.log('\n📊 Processing and scoring keywords...');
  const processed = processKeywords(allSuggestions);
  console.log(`   Processed ${processed.length} unique wine keywords`);

  // Step 4: Show top results
  console.log('\n🎯 Top 20 keyword opportunities:');
  processed.slice(0, 20).forEach((kw, i) => {
    console.log(`   ${i + 1}. [P${kw.priority}] ${kw.keyword}`);
    console.log(`      Vol: ${kw.estimatedVolume} | Diff: ${kw.estimatedDifficulty} | Intent: ${kw.intent}`);
  });

  return processed;
}

export default {
  runFreeKeywordResearch,
  getGoogleAutocompleteSuggestions,
  expandWithModifiers,
  processKeywords,
  calculatePriority,
  estimateSearchVolume,
  estimateDifficulty,
  determineIntent,
  isWineRelated,
  HIGH_VOLUME_WINE_SEEDS,
};
