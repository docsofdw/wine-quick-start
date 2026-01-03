/**
 * Simple Wine Keyword List - No API Required
 * Manually curated wine keywords for content generation
 */

export const wineKeywords = [
  // Food Pairings (High Priority)
  'wine with chicken',
  'wine with pork',
  'wine with beef stew',
  'wine with lasagna',
  'wine with pizza',
  'wine with sushi',
  'wine with tacos',
  'wine with pasta carbonara',
  'wine with grilled vegetables',
  'wine with cheese',
  'wine with chocolate dessert',
  'wine with spicy food',
  'wine with seafood',
  'wine with turkey',
  'wine with lamb',
  
  // Varietal Guides
  'merlot wine guide',
  'sauvignon blanc pairing',
  'syrah food pairing',
  'malbec wine guide',
  'zinfandel pairing',
  'riesling food pairing',
  'prosecco guide',
  'tempranillo wine',
  'grenache pairing',
  
  // Regional Guides
  'napa valley wine guide',
  'tuscany wine guide',
  'rioja wine guide',
  'champagne buying guide',
  'burgundy wine basics',
  'oregon pinot noir',
  'australian shiraz guide',
  
  // Price-Point Content
  'wine under $15',
  'wine under $25',
  'best value wines',
  'cheap wine recommendations',
  'affordable natural wine',
  'budget-friendly wine',
  
  // Occasion-Based
  'wine for dinner party',
  'wine for summer bbq',
  'wine for thanksgiving',
  'wine for christmas',
  'wine for date night',
  'wine for wedding',
  
  // Learning Content
  'how to taste wine',
  'wine tannins explained',
  'wine body meaning',
  'wine acidity guide',
  'wine aging basics',
  'organic wine explained',
  'biodynamic wine guide',
  'natural wine definition',
  
  // More Food Pairings
  'wine with burgers',
  'wine with bbq ribs',
  'wine with mac and cheese',
  'wine with fried chicken',
  'wine with curry',
  'wine with thai food',
  'wine with mexican food',
  'wine with chinese food',
  'wine with indian food',
  'wine with mediterranean food'
];

// Shuffle array helper
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get N random keywords
export function getRandomKeywords(count: number = 5): string[] {
  return shuffleArray(wineKeywords).slice(0, count);
}

// Add keyword to Supabase (for automation tracking)
export async function seedKeywordsToDatabase(supabase: any): Promise<void> {
  console.log('📝 Seeding keywords to database...');
  
  const keywordData = wineKeywords.map(keyword => ({
    keyword,
    search_volume: Math.floor(Math.random() * 500) + 100, // Simulated volume
    keyword_difficulty: Math.floor(Math.random() * 30) + 10, // Low to medium difficulty
    priority: Math.floor(Math.random() * 5) + 5, // Priority 5-10
    intent: keyword.includes('buy') || keyword.includes('price') ? 'commercial' : 'informational',
    status: 'active'
  }));
  
  const { error } = await supabase
    .from('keyword_opportunities')
    .upsert(keywordData, { onConflict: 'keyword', ignoreDuplicates: true });
  
  if (error) {
    console.error('Error seeding keywords:', error);
  } else {
    console.log(`✅ Seeded ${wineKeywords.length} keywords to database`);
  }
}

