/**
 * PPC Keyword Tools for Google Ads
 *
 * Features:
 * - Commercial intent scoring for ad campaigns
 * - Ad group organization
 * - Negative keyword generation
 * - Google Keyword Planner integration (import/export)
 * - ROAS potential estimation
 * - Landing page mapping
 */

import { HIGH_VOLUME_WINE_SEEDS, isWineRelated } from './free-keyword-tools.js';

// ============================================================================
// Types
// ============================================================================

export interface PPCKeyword {
  keyword: string;
  matchType: 'exact' | 'phrase' | 'broad';
  adGroup: string;
  intent: 'transactional' | 'commercial' | 'informational';
  estimatedCPC: number;
  estimatedVolume: number;
  competitionLevel: 'high' | 'medium' | 'low';
  qualityScorePotential: number; // 1-10
  conversionPotential: 'high' | 'medium' | 'low';
  suggestedBid: number;
  landingPage: string;
  ppcScore: number; // Overall PPC value score
}

export interface AdGroup {
  name: string;
  theme: string;
  keywords: PPCKeyword[];
  suggestedHeadlines: string[];
  suggestedDescriptions: string[];
  negativesKeywords: string[];
}

export interface PPCCampaignStructure {
  campaignName: string;
  adGroups: AdGroup[];
  campaignNegatives: string[];
  budget: {
    daily: number;
    monthly: number;
  };
  estimatedMetrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    cpa: number;
    roas: number;
  };
}

// ============================================================================
// Commercial Intent Keywords (Best for PPC)
// ============================================================================

// High-converting keywords (people ready to buy)
export const HIGH_INTENT_PPC_SEEDS = [
  // Direct purchase intent
  'buy wine online', 'order wine', 'wine delivery', 'wine subscription',
  'wine gift basket', 'wine gift box', 'wine club', 'wine of the month',
  'wine sampler', 'wine tasting kit', 'wine set',

  // Price-focused (high conversion)
  'best wine under 20', 'best wine under 30', 'best wine under 50',
  'cheap wine online', 'affordable wine delivery', 'wine deals',
  'wine sale', 'discount wine', 'bulk wine',

  // Gift searches (seasonal gold)
  'wine gift for', 'wine for christmas gift', 'wine for birthday',
  'wine for wedding gift', 'wine for anniversary', 'wine for boss',
  'wine for mom', 'wine for dad', 'wine for couple',

  // Occasion-based (high intent)
  'wine for dinner party', 'wine for date night', 'wine for thanksgiving',
  'wine for christmas dinner', 'wine for wedding', 'wine for celebration',

  // Specific product searches
  'cabernet sauvignon buy', 'pinot noir online', 'champagne delivery',
  'prosecco buy', 'red wine delivery', 'white wine online',

  // Local intent
  'wine delivery near me', 'wine store near me', 'wine shop online',
  'buy wine locally', 'same day wine delivery',

  // Subscription/recurring
  'monthly wine subscription', 'wine club membership', 'wine subscription box',
  'best wine subscription', 'cheap wine subscription',
];

// Keywords to AVOID in PPC (waste of budget)
export const PPC_NEGATIVE_KEYWORDS = [
  // Informational (won't convert)
  'what is wine', 'wine history', 'how is wine made', 'wine wikipedia',
  'wine definition', 'wine meaning', 'wine facts', 'wine information',

  // DIY/homemade
  'how to make wine', 'homemade wine', 'wine recipe', 'make wine at home',
  'wine making kit', 'wine making supplies', 'homebrew wine',

  // Jobs/careers
  'wine jobs', 'sommelier jobs', 'wine careers', 'winery jobs',
  'wine industry jobs', 'wine sales jobs',

  // Education (unless you sell courses)
  'wine course', 'wine certification', 'sommelier training', 'wset',
  'wine school', 'wine degree', 'wine classes near me',

  // Reviews/comparisons (low intent)
  'wine review', 'wine ratings', 'wine scores', 'wine critics',

  // Unrelated
  'wine colored', 'wine color', 'wine stain', 'wine hangover',
  'wine headache', 'wine allergy', 'wine calories',
  'wine alcohol content', 'wine vs beer health',

  // Competitor brands (unless intentional)
  'vivino', 'wine.com', 'total wine', 'drizly', 'naked wines',

  // Free stuff
  'free wine', 'wine samples free', 'free wine tasting',
];

// ============================================================================
// Intent & Scoring Functions
// ============================================================================

/**
 * Determine if keyword has commercial/transactional intent (good for PPC)
 */
export function getPPCIntent(keyword: string): 'transactional' | 'commercial' | 'informational' {
  const kw = keyword.toLowerCase();

  // Transactional: Ready to buy NOW
  const transactionalPatterns = [
    /\bbuy\b/, /\border\b/, /\bpurchase\b/, /\bshop\b/,
    /delivery/, /subscription/, /\bclub\b/, /online$/,
    /near me/, /same day/, /gift\s*(box|basket|set)/,
    /for sale/, /in stock/, /shipping/,
  ];

  if (transactionalPatterns.some(p => p.test(kw))) {
    return 'transactional';
  }

  // Commercial: Researching with intent to buy
  const commercialPatterns = [
    /\bbest\b/, /\btop\b/, /\bvs\b/, /versus/,
    /review/, /compare/, /recommend/,
    /under\s*\$?\d+/, /cheap/, /affordable/, /budget/,
    /for\s+(dinner|party|wedding|gift|christmas|thanksgiving)/,
  ];

  if (commercialPatterns.some(p => p.test(kw))) {
    return 'commercial';
  }

  return 'informational';
}

/**
 * Estimate CPC based on keyword characteristics
 * Wine industry average CPC: $1.50-4.00
 */
export function estimateCPC(keyword: string, intent: string): number {
  let baseCPC = 1.50;
  const kw = keyword.toLowerCase();

  // Intent multiplier
  if (intent === 'transactional') baseCPC *= 2.0;
  else if (intent === 'commercial') baseCPC *= 1.5;

  // High-value modifiers
  if (/subscription|club|monthly/.test(kw)) baseCPC *= 1.8; // LTV is high
  if (/gift|christmas|wedding/.test(kw)) baseCPC *= 1.5; // Seasonal premium
  if (/champagne|bordeaux|napa/.test(kw)) baseCPC *= 1.4; // Premium products
  if (/delivery|online|buy/.test(kw)) baseCPC *= 1.3; // Direct purchase

  // Lower value modifiers
  if (/cheap|budget|affordable/.test(kw)) baseCPC *= 0.8;
  if (/under\s*\$?15/.test(kw)) baseCPC *= 0.7;

  return Math.round(baseCPC * 100) / 100;
}

/**
 * Estimate conversion potential
 */
export function getConversionPotential(keyword: string, intent: string): 'high' | 'medium' | 'low' {
  if (intent === 'informational') return 'low';

  const kw = keyword.toLowerCase();

  // High conversion signals
  const highConversion = [
    /\bbuy\b/, /\border\b/, /delivery/, /subscription/,
    /gift\s*(box|basket)/, /near me/, /same day/,
  ];

  if (highConversion.some(p => p.test(kw))) return 'high';

  // Medium conversion
  if (intent === 'commercial') return 'medium';

  return 'low';
}

/**
 * Calculate overall PPC score (1-100)
 * Higher = better for paid ads
 */
export function calculatePPCScore(keyword: string): number {
  const intent = getPPCIntent(keyword);
  const conversionPotential = getConversionPotential(keyword, intent);
  const cpc = estimateCPC(keyword, intent);
  const kw = keyword.toLowerCase();

  let score = 50; // Base

  // Intent scoring (biggest factor)
  if (intent === 'transactional') score += 30;
  else if (intent === 'commercial') score += 15;
  else score -= 20;

  // Conversion potential
  if (conversionPotential === 'high') score += 15;
  else if (conversionPotential === 'medium') score += 5;
  else score -= 10;

  // Keyword specificity (more specific = better)
  const wordCount = kw.split(/\s+/).length;
  if (wordCount >= 3 && wordCount <= 5) score += 10;
  else if (wordCount > 5) score += 5;

  // Value signals
  if (/subscription|club/.test(kw)) score += 10; // High LTV
  if (/gift/.test(kw)) score += 8; // Good margins
  if (/premium|luxury|fine/.test(kw)) score += 5;

  // Negative signals
  if (/free|how to make|recipe|history|what is/.test(kw)) score -= 30;
  if (/jobs|career|course|certification/.test(kw)) score -= 40;

  return Math.min(100, Math.max(0, score));
}

/**
 * Determine the best ad group for a keyword
 */
export function determineAdGroup(keyword: string): string {
  const kw = keyword.toLowerCase();

  // Gift keywords
  if (/gift|present|christmas|birthday|anniversary|wedding gift/.test(kw)) {
    return 'Wine Gifts';
  }

  // Subscription keywords
  if (/subscription|club|monthly|membership/.test(kw)) {
    return 'Wine Subscriptions';
  }

  // Price-focused
  if (/under\s*\$?\d+|cheap|affordable|budget|deal|sale|discount/.test(kw)) {
    return 'Budget Wine';
  }

  // Delivery/purchase
  if (/delivery|buy online|order|shop|near me/.test(kw)) {
    return 'Wine Delivery';
  }

  // Food pairings
  if (/with\s+(steak|chicken|salmon|fish|pasta|pizza|cheese|turkey|beef)/.test(kw) || /pairing/.test(kw)) {
    return 'Wine Pairings';
  }

  // Specific varietals
  if (/cabernet|merlot|pinot noir|chardonnay|sauvignon blanc|riesling|malbec/.test(kw)) {
    return 'Wine Varietals';
  }

  // Sparkling
  if (/champagne|prosecco|sparkling|cava|bubbles/.test(kw)) {
    return 'Sparkling Wine';
  }

  // Red wine
  if (/red wine/.test(kw)) {
    return 'Red Wine';
  }

  // White wine
  if (/white wine/.test(kw)) {
    return 'White Wine';
  }

  // Occasions
  if (/thanksgiving|christmas|dinner party|date night|celebration/.test(kw)) {
    return 'Wine for Occasions';
  }

  return 'General Wine';
}

/**
 * Suggest landing page based on keyword
 */
export function suggestLandingPage(keyword: string, adGroup: string): string {
  const kw = keyword.toLowerCase();

  const landingPages: Record<string, string> = {
    'Wine Gifts': '/gifts',
    'Wine Subscriptions': '/subscription',
    'Budget Wine': '/buy/best-wines-under-20',
    'Wine Delivery': '/shop',
    'Wine Pairings': '/wine-pairings',
    'Wine Varietals': '/learn',
    'Sparkling Wine': '/buy/sparkling-wine',
    'Red Wine': '/buy/red-wine',
    'White Wine': '/buy/white-wine',
    'Wine for Occasions': '/buy',
    'General Wine': '/',
  };

  // Specific overrides
  if (/under\s*\$?20/.test(kw)) return '/buy/best-wines-under-20';
  if (/under\s*\$?30/.test(kw)) return '/buy/best-wines-under-30';
  if (/under\s*\$?50/.test(kw)) return '/buy/best-wines-under-50';
  if (/steak/.test(kw)) return '/wine-pairings/wine-with-steak';
  if (/salmon/.test(kw)) return '/wine-pairings/wine-with-salmon';
  if (/chicken/.test(kw)) return '/wine-pairings/wine-with-chicken';
  if (/thanksgiving/.test(kw)) return '/wine-pairings/wine-for-thanksgiving';
  if (/christmas/.test(kw)) return '/buy/wine-for-christmas';

  return landingPages[adGroup] || '/';
}

// ============================================================================
// Ad Group & Campaign Generation
// ============================================================================

/**
 * Generate ad headlines for an ad group
 */
export function generateAdHeadlines(adGroupName: string): string[] {
  const headlines: Record<string, string[]> = {
    'Wine Gifts': [
      'Perfect Wine Gifts',
      'Wine Gift Boxes From $29',
      'Curated Wine Gifts',
      'Sommelier-Selected Gifts',
      'Wine Gifts They\'ll Love',
      'Gift Wine Like A Pro',
    ],
    'Wine Subscriptions': [
      'Wine Club From $49/mo',
      'Monthly Wine Subscription',
      'Discover New Wines Monthly',
      'Cancel Anytime Wine Club',
      'Sommelier Curated Wines',
      'Wine Subscription Box',
    ],
    'Budget Wine': [
      'Great Wine Under $20',
      'Quality Wine, Fair Prices',
      'Sommelier Picks Under $30',
      '$15 Wines That Taste $50',
      'Best Value Wines Online',
      'Cheap Wine, No Compromise',
    ],
    'Wine Delivery': [
      'Wine Delivered To You',
      'Free Shipping Over $75',
      'Fast Wine Delivery',
      'Order Wine Online Today',
      'Wine To Your Door',
      'Shop 1000+ Wines Online',
    ],
    'Wine Pairings': [
      'Perfect Wine Pairings',
      'What Wine With Dinner?',
      'Sommelier Pairing Tips',
      'Wine + Food Made Easy',
      'Expert Pairing Guides',
      'Never Mismatch Again',
    ],
    'Wine for Occasions': [
      'Wine For Every Occasion',
      'Thanksgiving Wine Picks',
      'Wedding Wine Selection',
      'Dinner Party Wines',
      'Date Night Bottles',
      'Celebrate With Wine',
    ],
  };

  return headlines[adGroupName] || [
    'Quality Wines Online',
    'Sommelier Selections',
    'Shop Wine Today',
    'Expert Wine Picks',
    'Discover Great Wine',
    'Wine Made Simple',
  ];
}

/**
 * Generate ad descriptions for an ad group
 */
export function generateAdDescriptions(adGroupName: string): string[] {
  const descriptions: Record<string, string[]> = {
    'Wine Gifts': [
      'Beautifully packaged wine gifts curated by sommeliers. Perfect for any occasion. Free gift wrapping available.',
      'Make gift-giving easy with our expert-selected wine gift boxes. Prices from $29. Ships nationwide.',
    ],
    'Wine Subscriptions': [
      'Get hand-picked wines delivered monthly. Taste new regions, learn from experts. Cancel anytime. Start at $49/month.',
      'Join our wine club and discover sommelier-selected bottles each month. Flexible plans, no commitment required.',
    ],
    'Budget Wine': [
      'Great wine doesn\'t have to cost a fortune. Our sommeliers pick the best bottles under $20. Shop now.',
      'Discover wines that taste twice their price. Expert selections at budget-friendly prices. Free shipping $75+.',
    ],
    'Wine Delivery': [
      'Shop 1000+ wines online with fast, reliable delivery. Temperature-controlled shipping. Free over $75.',
      'Order wine online and get it delivered to your door. Expert picks, competitive prices, fast shipping.',
    ],
    'Wine Pairings': [
      'Not sure what wine to serve? Our pairing guides make it easy. Perfect matches for any meal.',
      'Sommelier-approved wine pairings for every dish. From steak night to seafood. Shop paired wines.',
    ],
  };

  return descriptions[adGroupName] || [
    'Quality wines selected by certified sommeliers. Expert picks at every price point. Free shipping over $75.',
    'Discover your new favorite wine. Curated selections, expert guidance, fast delivery. Shop now.',
  ];
}

/**
 * Process keywords for PPC campaign
 */
export function processKeywordsForPPC(keywords: string[]): PPCKeyword[] {
  return keywords
    .filter(kw => {
      // Filter out negative keywords
      const lower = kw.toLowerCase();
      return !PPC_NEGATIVE_KEYWORDS.some(neg => lower.includes(neg.toLowerCase()));
    })
    .filter(kw => isWineRelated(kw) || /wine|pairing/.test(kw.toLowerCase()))
    .map(keyword => {
      const intent = getPPCIntent(keyword);
      const adGroup = determineAdGroup(keyword);
      const cpc = estimateCPC(keyword, intent);

      return {
        keyword,
        matchType: 'phrase' as const,
        adGroup,
        intent,
        estimatedCPC: cpc,
        estimatedVolume: intent === 'transactional' ? 500 : intent === 'commercial' ? 1000 : 2000,
        competitionLevel: cpc > 3 ? 'high' : cpc > 2 ? 'medium' : 'low',
        qualityScorePotential: intent === 'transactional' ? 8 : intent === 'commercial' ? 7 : 5,
        conversionPotential: getConversionPotential(keyword, intent),
        suggestedBid: Math.round(cpc * 1.2 * 100) / 100,
        landingPage: suggestLandingPage(keyword, adGroup),
        ppcScore: calculatePPCScore(keyword),
      };
    })
    .filter(kw => kw.ppcScore >= 40) // Only keep keywords worth bidding on
    .sort((a, b) => b.ppcScore - a.ppcScore);
}

/**
 * Organize keywords into ad groups
 */
export function organizeIntoAdGroups(ppcKeywords: PPCKeyword[]): AdGroup[] {
  const groupMap = new Map<string, PPCKeyword[]>();

  for (const kw of ppcKeywords) {
    const existing = groupMap.get(kw.adGroup) || [];
    existing.push(kw);
    groupMap.set(kw.adGroup, existing);
  }

  const adGroups: AdGroup[] = [];

  for (const [name, keywords] of groupMap) {
    adGroups.push({
      name,
      theme: name,
      keywords: keywords.slice(0, 50), // Max 50 keywords per ad group
      suggestedHeadlines: generateAdHeadlines(name),
      suggestedDescriptions: generateAdDescriptions(name),
      negativesKeywords: getAdGroupNegatives(name),
    });
  }

  return adGroups.sort((a, b) => {
    const aScore = a.keywords.reduce((sum, k) => sum + k.ppcScore, 0) / a.keywords.length;
    const bScore = b.keywords.reduce((sum, k) => sum + k.ppcScore, 0) / b.keywords.length;
    return bScore - aScore;
  });
}

/**
 * Get negative keywords specific to an ad group
 */
function getAdGroupNegatives(adGroupName: string): string[] {
  const negatives: Record<string, string[]> = {
    'Wine Gifts': ['diy', 'make your own', 'homemade', 'free'],
    'Wine Subscriptions': ['cancel', 'refund', 'complaint', 'review'],
    'Budget Wine': ['premium', 'luxury', 'expensive', 'rare'],
    'Wine Delivery': ['pick up', 'in store', 'local only'],
    'Wine Pairings': ['recipe', 'how to cook', 'restaurant'],
  };

  return negatives[adGroupName] || [];
}

/**
 * Generate complete PPC campaign structure
 */
export function generatePPCCampaign(keywords: string[], dailyBudget: number = 50): PPCCampaignStructure {
  const ppcKeywords = processKeywordsForPPC(keywords);
  const adGroups = organizeIntoAdGroups(ppcKeywords);

  // Estimate metrics
  const avgCPC = ppcKeywords.reduce((sum, k) => sum + k.estimatedCPC, 0) / ppcKeywords.length;
  const estimatedClicks = Math.floor(dailyBudget / avgCPC);
  const conversionRate = 0.03; // 3% average for wine
  const avgOrderValue = 75;

  return {
    campaignName: 'Wine Quick Start - Search',
    adGroups,
    campaignNegatives: PPC_NEGATIVE_KEYWORDS.slice(0, 50),
    budget: {
      daily: dailyBudget,
      monthly: dailyBudget * 30,
    },
    estimatedMetrics: {
      impressions: estimatedClicks * 20, // 5% CTR estimate
      clicks: estimatedClicks * 30, // Monthly
      conversions: Math.round(estimatedClicks * 30 * conversionRate),
      cpa: Math.round(dailyBudget * 30 / (estimatedClicks * 30 * conversionRate)),
      roas: Math.round((estimatedClicks * 30 * conversionRate * avgOrderValue) / (dailyBudget * 30) * 100) / 100,
    },
  };
}

/**
 * Export keywords in Google Ads Editor format (CSV)
 */
export function exportToGoogleAdsFormat(campaign: PPCCampaignStructure): string {
  const lines: string[] = [];

  // Header
  lines.push('Campaign,Ad Group,Keyword,Match Type,Max CPC,Final URL');

  // Keywords
  for (const adGroup of campaign.adGroups) {
    for (const kw of adGroup.keywords) {
      const matchTypeSymbol = kw.matchType === 'exact' ? `[${kw.keyword}]` :
                              kw.matchType === 'phrase' ? `"${kw.keyword}"` :
                              kw.keyword;
      lines.push(
        `${campaign.campaignName},${adGroup.name},${matchTypeSymbol},${kw.matchType},${kw.suggestedBid},https://winesquickstart.com${kw.landingPage}`
      );
    }
  }

  return lines.join('\n');
}

/**
 * Export negative keywords
 */
export function exportNegativeKeywords(campaign: PPCCampaignStructure): string {
  const lines = ['Negative Keyword,Level'];

  for (const neg of campaign.campaignNegatives) {
    lines.push(`${neg},Campaign`);
  }

  for (const adGroup of campaign.adGroups) {
    for (const neg of adGroup.negativesKeywords) {
      lines.push(`${neg},Ad Group: ${adGroup.name}`);
    }
  }

  return lines.join('\n');
}

export default {
  processKeywordsForPPC,
  organizeIntoAdGroups,
  generatePPCCampaign,
  exportToGoogleAdsFormat,
  exportNegativeKeywords,
  calculatePPCScore,
  getPPCIntent,
  estimateCPC,
  HIGH_INTENT_PPC_SEEDS,
  PPC_NEGATIVE_KEYWORDS,
};
