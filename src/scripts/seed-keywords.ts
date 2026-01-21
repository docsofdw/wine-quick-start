/**
 * Seed keywords to Supabase for article generation
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const wineKeywords = [
  // Food Pairings
  'wine with pork',
  'wine with beef stew',
  'wine with lasagna',
  'wine with sushi',
  'wine with tacos',
  'wine with pasta carbonara',
  'wine with grilled vegetables',
  'wine with cheese',
  'wine with chocolate dessert',
  'wine with spicy food',
  'wine with lamb',
  // Varietal Guides
  'syrah food pairing',
  'tempranillo wine',
  'grenache pairing',
  // Regional Guides
  'tuscany wine guide',
  'rioja wine guide',
  'oregon pinot noir',
  'australian shiraz guide',
  // Price-Point Content
  'wine under 15',
  'wine under 25',
  'best value wines',
  // Occasion-Based
  'wine for dinner party',
  'wine for summer bbq',
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

async function seedKeywords() {
  console.log('🌱 Seeding keywords to database...\n');

  const keywordData = wineKeywords.map(keyword => ({
    keyword,
    search_volume: Math.floor(Math.random() * 500) + 200,
    keyword_difficulty: Math.floor(Math.random() * 20) + 10,
    priority: 9,
    intent: keyword.includes('buy') || keyword.includes('price') || keyword.includes('under') ? 'commercial' : 'informational',
    status: 'active'
  }));

  const { error } = await supabase
    .from('keyword_opportunities')
    .upsert(keywordData, { onConflict: 'keyword', ignoreDuplicates: false });

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log(`✅ Seeded ${wineKeywords.length} keywords with priority 9`);
  }
}

seedKeywords().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
