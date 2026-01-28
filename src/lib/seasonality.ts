/**
 * Wine Keyword Seasonality Detection
 *
 * Uses known seasonal patterns for wine searches plus
 * optional Google Trends data import for precise timing.
 *
 * Wine industry seasonal patterns:
 * - Gift keywords: Peak Nov-Dec (400%+ increase)
 * - Thanksgiving: Peak late Oct - early Nov
 * - Summer wines (rosé, sparkling): Peak May-Aug
 * - Holiday parties: Peak Dec
 * - Valentine's: Peak early Feb
 * - New Year: Peak late Dec
 */

export type SeasonalityType = 'evergreen' | 'seasonal' | 'holiday' | 'trending';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface SeasonalityProfile {
  type: SeasonalityType;
  peakMonths: number[]; // 1-12
  lowMonths: number[];
  peakMultiplier: number; // How much traffic increases during peak
  description: string;
  budgetStrategy: string;
}

export interface MonthlyTrend {
  month: number;
  relativeVolume: number; // 0-100, where 100 is peak
  recommended: boolean;
  budgetMultiplier: number;
}

// ============================================================================
// Known Wine Seasonal Patterns
// ============================================================================

const SEASONAL_PATTERNS: Record<string, SeasonalityProfile> = {
  // Gift-related (HIGHEST seasonality)
  'wine gift': {
    type: 'holiday',
    peakMonths: [11, 12],
    lowMonths: [1, 2, 3, 6, 7, 8],
    peakMultiplier: 4.5,
    description: 'Massive spike Nov-Dec for holiday gifting',
    budgetStrategy: 'Increase budget 4x in Nov-Dec, reduce to minimal Jan-Feb',
  },
  'wine gift basket': {
    type: 'holiday',
    peakMonths: [11, 12],
    lowMonths: [1, 2, 6, 7, 8],
    peakMultiplier: 5.0,
    description: 'Highest volume mid-Nov through Christmas',
    budgetStrategy: 'Start ramping up budget early November, peak Dec 1-20',
  },
  'wine christmas': {
    type: 'holiday',
    peakMonths: [12],
    lowMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    peakMultiplier: 10.0,
    description: 'Almost exclusively December traffic',
    budgetStrategy: 'Only bid Nov 15 - Dec 24, pause rest of year',
  },

  // Thanksgiving
  'thanksgiving wine': {
    type: 'holiday',
    peakMonths: [11],
    lowMonths: [1, 2, 3, 4, 5, 6, 7, 8, 12],
    peakMultiplier: 15.0,
    description: 'Sharp spike 2 weeks before Thanksgiving',
    budgetStrategy: 'Only bid Nov 1-28, with peak budget Nov 15-27',
  },
  'wine for thanksgiving': {
    type: 'holiday',
    peakMonths: [11],
    lowMonths: [1, 2, 3, 4, 5, 6, 7, 8, 12],
    peakMultiplier: 12.0,
    description: 'Peaks the week before Thanksgiving',
    budgetStrategy: 'Concentrate budget Nov 15-27',
  },
  'wine with turkey': {
    type: 'holiday',
    peakMonths: [11],
    lowMonths: [1, 2, 3, 4, 5, 6, 7, 8],
    peakMultiplier: 8.0,
    description: 'Thanksgiving-driven but some Christmas traffic',
    budgetStrategy: 'Primary budget Nov, secondary Dec',
  },

  // Valentine's Day
  'valentine wine': {
    type: 'holiday',
    peakMonths: [2],
    lowMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    peakMultiplier: 6.0,
    description: 'Sharp spike first 2 weeks of February',
    budgetStrategy: 'Only bid Jan 25 - Feb 14',
  },
  'romantic wine': {
    type: 'seasonal',
    peakMonths: [2, 12],
    lowMonths: [3, 6, 7, 8],
    peakMultiplier: 3.0,
    description: 'Valentine\'s and holiday date nights',
    budgetStrategy: 'Boost budget Feb and Dec',
  },

  // Summer wines
  'rosé': {
    type: 'seasonal',
    peakMonths: [5, 6, 7, 8],
    lowMonths: [11, 12, 1, 2],
    peakMultiplier: 2.5,
    description: 'Summer wine - peaks May through August',
    budgetStrategy: 'Increase budget 2.5x for summer months',
  },
  'rosé wine': {
    type: 'seasonal',
    peakMonths: [5, 6, 7, 8],
    lowMonths: [11, 12, 1, 2],
    peakMultiplier: 2.5,
    description: 'Summer wine - peaks May through August',
    budgetStrategy: 'Increase budget 2.5x for summer months',
  },
  'summer wine': {
    type: 'seasonal',
    peakMonths: [6, 7, 8],
    lowMonths: [11, 12, 1, 2, 3],
    peakMultiplier: 3.0,
    description: 'Peaks during summer months',
    budgetStrategy: 'Primary budget June-August',
  },
  'wine for bbq': {
    type: 'seasonal',
    peakMonths: [5, 6, 7],
    lowMonths: [11, 12, 1, 2],
    peakMultiplier: 2.0,
    description: 'Summer grilling season',
    budgetStrategy: 'Increase budget Memorial Day through July 4th',
  },
  'picnic wine': {
    type: 'seasonal',
    peakMonths: [5, 6, 7, 8],
    lowMonths: [11, 12, 1, 2],
    peakMultiplier: 2.5,
    description: 'Warm weather outdoor activities',
    budgetStrategy: 'May-August budget increase',
  },

  // Sparkling/Celebration
  'champagne': {
    type: 'holiday',
    peakMonths: [12],
    lowMonths: [1, 2, 3, 6, 7, 8],
    peakMultiplier: 3.5,
    description: 'New Year\'s Eve drives massive December spike',
    budgetStrategy: 'Increase budget 3x in December, especially Dec 20-31',
  },
  'prosecco': {
    type: 'seasonal',
    peakMonths: [5, 6, 7, 12],
    lowMonths: [1, 2, 3],
    peakMultiplier: 2.0,
    description: 'Summer + New Year\'s peaks',
    budgetStrategy: 'Two peak periods: summer and December',
  },
  'sparkling wine': {
    type: 'holiday',
    peakMonths: [12],
    lowMonths: [1, 2, 3, 6, 7, 8],
    peakMultiplier: 2.5,
    description: 'Holiday celebrations drive December traffic',
    budgetStrategy: 'Primary budget December, secondary for summer',
  },

  // Evergreen (stable year-round)
  'wine delivery': {
    type: 'evergreen',
    peakMonths: [11, 12],
    lowMonths: [],
    peakMultiplier: 1.5,
    description: 'Stable with slight holiday bump',
    budgetStrategy: 'Consistent budget with 50% increase Nov-Dec',
  },
  'wine subscription': {
    type: 'evergreen',
    peakMonths: [1, 12],
    lowMonths: [],
    peakMultiplier: 1.3,
    description: 'Stable with New Year resolution bump',
    budgetStrategy: 'Consistent budget, slight increase Jan and Dec',
  },
  'red wine': {
    type: 'seasonal',
    peakMonths: [10, 11, 12, 1, 2],
    lowMonths: [6, 7, 8],
    peakMultiplier: 1.4,
    description: 'Cold weather preference - higher in fall/winter',
    budgetStrategy: 'Increase budget 40% Oct-Feb, reduce summer',
  },
  'white wine': {
    type: 'seasonal',
    peakMonths: [5, 6, 7, 8],
    lowMonths: [11, 12, 1, 2],
    peakMultiplier: 1.3,
    description: 'Warm weather preference - higher in spring/summer',
    budgetStrategy: 'Increase budget 30% May-Aug',
  },
  'wine pairing': {
    type: 'evergreen',
    peakMonths: [11, 12],
    lowMonths: [],
    peakMultiplier: 1.4,
    description: 'Stable with holiday entertaining bump',
    budgetStrategy: 'Consistent with 40% increase Nov-Dec',
  },
  'best wine': {
    type: 'evergreen',
    peakMonths: [11, 12],
    lowMonths: [],
    peakMultiplier: 1.3,
    description: 'Mostly stable year-round',
    budgetStrategy: 'Consistent budget throughout year',
  },

  // Budget wines
  'cheap wine': {
    type: 'evergreen',
    peakMonths: [1, 11, 12],
    lowMonths: [],
    peakMultiplier: 1.2,
    description: 'Stable with slight holiday/new year bumps',
    budgetStrategy: 'Consistent budget, slight Jan bump (resolutions)',
  },
  'wine under 20': {
    type: 'evergreen',
    peakMonths: [11, 12],
    lowMonths: [],
    peakMultiplier: 1.4,
    description: 'Budget searches increase during gift season',
    budgetStrategy: 'Increase 40% Nov-Dec for gift givers on budget',
  },
};

// ============================================================================
// Seasonality Detection Functions
// ============================================================================

/**
 * Detect seasonality profile for a keyword
 */
export function detectSeasonality(keyword: string): SeasonalityProfile {
  const kw = keyword.toLowerCase();

  // Check exact matches first
  for (const [pattern, profile] of Object.entries(SEASONAL_PATTERNS)) {
    if (kw.includes(pattern)) {
      return profile;
    }
  }

  // Check for seasonal indicators
  if (/christmas|xmas|holiday gift|stocking/.test(kw)) {
    return SEASONAL_PATTERNS['wine christmas'] || createHolidayProfile([12]);
  }

  if (/thanksgiving|turkey dinner/.test(kw)) {
    return SEASONAL_PATTERNS['thanksgiving wine'] || createHolidayProfile([11]);
  }

  if (/valentine|romantic|date night/.test(kw)) {
    return SEASONAL_PATTERNS['valentine wine'] || createHolidayProfile([2]);
  }

  if (/summer|bbq|barbecue|picnic|outdoor|patio/.test(kw)) {
    return SEASONAL_PATTERNS['summer wine'] || createSeasonalProfile([6, 7, 8]);
  }

  if (/gift|present|basket|box/.test(kw)) {
    return SEASONAL_PATTERNS['wine gift'] || createHolidayProfile([11, 12]);
  }

  if (/rosé|rose wine|pink wine/.test(kw)) {
    return SEASONAL_PATTERNS['rosé'] || createSeasonalProfile([5, 6, 7, 8]);
  }

  if (/champagne|sparkling|bubbles|prosecco|cava/.test(kw)) {
    return SEASONAL_PATTERNS['champagne'] || createHolidayProfile([12]);
  }

  // Default: evergreen
  return {
    type: 'evergreen',
    peakMonths: [],
    lowMonths: [],
    peakMultiplier: 1.0,
    description: 'Stable year-round search volume',
    budgetStrategy: 'Maintain consistent budget throughout year',
  };
}

function createHolidayProfile(peakMonths: number[]): SeasonalityProfile {
  return {
    type: 'holiday',
    peakMonths,
    lowMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(m => !peakMonths.includes(m)),
    peakMultiplier: 3.0,
    description: 'Holiday-driven traffic pattern',
    budgetStrategy: `Focus budget on months: ${peakMonths.join(', ')}`,
  };
}

function createSeasonalProfile(peakMonths: number[]): SeasonalityProfile {
  return {
    type: 'seasonal',
    peakMonths,
    lowMonths: [],
    peakMultiplier: 2.0,
    description: 'Seasonal traffic pattern',
    budgetStrategy: `Increase budget during months: ${peakMonths.join(', ')}`,
  };
}

/**
 * Get monthly trend data for a keyword
 */
export function getMonthlyTrends(keyword: string): MonthlyTrend[] {
  const profile = detectSeasonality(keyword);
  const trends: MonthlyTrend[] = [];

  for (let month = 1; month <= 12; month++) {
    const isPeak = profile.peakMonths.includes(month);
    const isLow = profile.lowMonths.includes(month);

    let relativeVolume = 50; // Base
    let budgetMultiplier = 1.0;

    if (isPeak) {
      relativeVolume = 100;
      budgetMultiplier = profile.peakMultiplier;
    } else if (isLow) {
      relativeVolume = 25;
      budgetMultiplier = 0.5;
    }

    trends.push({
      month,
      relativeVolume,
      recommended: isPeak || (!isLow && profile.type === 'evergreen'),
      budgetMultiplier,
    });
  }

  return trends;
}

/**
 * Get current month recommendation
 */
export function getCurrentMonthRecommendation(keyword: string): {
  shouldBid: boolean;
  budgetMultiplier: number;
  reason: string;
} {
  const currentMonth = new Date().getMonth() + 1;
  const profile = detectSeasonality(keyword);
  const trends = getMonthlyTrends(keyword);
  const currentTrend = trends[currentMonth - 1];

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (profile.peakMonths.includes(currentMonth)) {
    return {
      shouldBid: true,
      budgetMultiplier: profile.peakMultiplier,
      reason: `Peak season for "${keyword}" - increase budget ${profile.peakMultiplier}x`,
    };
  }

  if (profile.lowMonths.includes(currentMonth)) {
    return {
      shouldBid: profile.type === 'evergreen',
      budgetMultiplier: 0.25,
      reason: `Low season for "${keyword}" - consider pausing or reducing budget 75%`,
    };
  }

  // Check if peak is coming soon (within 2 months)
  const upcomingPeak = profile.peakMonths.find(m =>
    m > currentMonth && m <= currentMonth + 2
  );

  if (upcomingPeak) {
    return {
      shouldBid: true,
      budgetMultiplier: 1.5,
      reason: `Peak season coming in ${monthNames[upcomingPeak - 1]} - start building quality score now`,
    };
  }

  return {
    shouldBid: true,
    budgetMultiplier: 1.0,
    reason: 'Stable period - maintain consistent budget',
  };
}

/**
 * Get seasonal calendar for the year
 */
export function getSeasonalCalendar(): Map<number, string[]> {
  const calendar = new Map<number, string[]>();

  const events: Record<number, string[]> = {
    1: ['New Year resolutions', 'Winter wine interest'],
    2: ['Valentine\'s Day (peak Feb 1-14)', 'Romantic wine searches'],
    3: ['Spring wine releases', 'Rosé season starting'],
    4: ['Spring wine festivals', 'Easter entertaining'],
    5: ['Mother\'s Day gifts', 'Summer wine ramp-up', 'Rosé peak begins'],
    6: ['Father\'s Day gifts', 'Summer wine peak', 'Wedding season'],
    7: ['Summer entertaining peak', 'BBQ wine searches', 'Independence Day'],
    8: ['Late summer wines', 'Back-to-school wine'],
    9: ['Fall wine transition', 'Harvest season interest'],
    10: ['Fall wine peak', 'Halloween parties', 'Thanksgiving prep begins'],
    11: ['THANKSGIVING PEAK', 'Black Friday wine deals', 'Gift season starts'],
    12: ['HOLIDAY GIFT PEAK', 'Christmas wine', 'New Year champagne'],
  };

  for (const [month, items] of Object.entries(events)) {
    calendar.set(parseInt(month), items);
  }

  return calendar;
}

/**
 * Get optimized yearly budget allocation
 */
export function getOptimizedBudgetAllocation(
  monthlyBudget: number,
  keywords: string[]
): Map<number, number> {
  const allocation = new Map<number, number>();

  // Calculate average seasonality across all keywords
  const monthlyScores = new Array(12).fill(0);

  for (const keyword of keywords) {
    const trends = getMonthlyTrends(keyword);
    for (const trend of trends) {
      monthlyScores[trend.month - 1] += trend.budgetMultiplier;
    }
  }

  // Normalize to get relative weights
  const total = monthlyScores.reduce((a, b) => a + b, 0);
  const weights = monthlyScores.map(score => score / total);

  // Allocate yearly budget
  const yearlyBudget = monthlyBudget * 12;

  for (let month = 1; month <= 12; month++) {
    const monthBudget = Math.round(yearlyBudget * weights[month - 1]);
    allocation.set(month, monthBudget);
  }

  return allocation;
}

export default {
  detectSeasonality,
  getMonthlyTrends,
  getCurrentMonthRecommendation,
  getSeasonalCalendar,
  getOptimizedBudgetAllocation,
  SEASONAL_PATTERNS,
};
