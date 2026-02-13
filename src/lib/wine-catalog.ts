import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Wine Catalog Database Client
// Connects to external Supabase project containing real wine data

let wineCatalogClient: SupabaseClient | null = null;

/**
 * Get wine catalog environment variables
 * Lazy-loaded to support dotenv in scripts
 */
function getWineCatalogEnv(): { url: string; key: string } {
  // Support both Astro (import.meta.env) and Node.js scripts (process.env)
  const url = (typeof process !== 'undefined' && process.env?.WINE_CATALOG_URL)
    || (import.meta.env?.WINE_CATALOG_URL as string);
  const key = (typeof process !== 'undefined' && process.env?.WINE_CATALOG_ANON_KEY)
    || (import.meta.env?.WINE_CATALOG_ANON_KEY as string);

  if (!url || !key) {
    throw new Error(
      'Wine Catalog environment variables are missing. Please set WINE_CATALOG_URL and WINE_CATALOG_ANON_KEY in your environment.'
    );
  }

  return { url, key };
}

function getWineCatalogClient(): SupabaseClient {
  if (!wineCatalogClient) {
    const { url, key } = getWineCatalogEnv();
    wineCatalogClient = createClient(url, key);
  }

  return wineCatalogClient;
}

// ---------------------------------------------------------------------------
// Wine Catalog Types
// ---------------------------------------------------------------------------

export interface Wine {
  id: string;
  producer: string;
  wine_name: string;
  vintage: number | null;
  region: string | null;
  subregion: string | null;
  variety: string | null;
  bottle_size_ml: number;
  external_id: string | null;
  is_cult: boolean;
  created_at: string;
}

export interface WineRecommendation {
  name: string;
  producer: string;
  region: string;
  vintage: number | null;
  variety: string | null;
  wine_type: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Wine Fetching Functions
// ---------------------------------------------------------------------------

// Map varieties to wine types for filtering
const redVarieties = ['cabernet', 'merlot', 'pinot noir', 'syrah', 'shiraz', 'zinfandel', 'malbec', 'tempranillo', 'sangiovese', 'nebbiolo', 'grenache', 'mourvedre', 'petite sirah', 'barbera', 'primitivo'];
const whiteVarieties = ['chardonnay', 'sauvignon blanc', 'riesling', 'pinot grigio', 'pinot gris', 'viognier', 'gewurztraminer', 'chenin blanc', 'semillon', 'gruner veltliner', 'albarino', 'vermentino', 'muscadet'];
const roseVarieties = ['rose', 'rosé', 'rosato'];
const sparklingVarieties = ['champagne', 'prosecco', 'cava', 'cremant', 'sparkling', 'brut', 'blanc de blancs', 'blanc de noirs'];

function getVarietiesForWineType(wineType: string): string[] {
  const lowerType = wineType.toLowerCase();
  if (lowerType === 'red') return redVarieties.slice(0, 5);
  if (lowerType === 'white') return whiteVarieties.slice(0, 5);
  if (lowerType === 'rosé' || lowerType === 'rose') return roseVarieties;
  if (lowerType === 'sparkling') return sparklingVarieties.slice(0, 3);
  return [];
}

/**
 * Infer wine type from variety
 */
function inferWineType(variety: string | null): string {
  if (!variety) return 'red';
  const lowerVariety = variety.toLowerCase();

  if (sparklingVarieties.some(v => lowerVariety.includes(v))) return 'sparkling';
  if (roseVarieties.some(v => lowerVariety.includes(v))) return 'rosé';
  if (whiteVarieties.some(v => lowerVariety.includes(v))) return 'white';
  if (redVarieties.some(v => lowerVariety.includes(v))) return 'red';

  return 'red'; // Default to red
}

/**
 * Fetch wines by wine type (red, white, rosé, sparkling, etc.)
 * Filters by variety since wine_type column doesn't exist
 */
export async function getWinesByType(
  wineType: string,
  limit: number = 5
): Promise<Wine[]> {
  const client = getWineCatalogClient();

  // Map wine type to varieties to search for
  const varietiesToSearch = getVarietiesForWineType(wineType);

  if (varietiesToSearch.length === 0) {
    // Fallback to random wines
    return getRandomWines(limit);
  }

  // Build OR query for varieties
  const orConditions = varietiesToSearch.map(v => `variety.ilike.%${v}%`).join(',');

  const { data, error } = await client
    .from('wine_catalog')
    .select('*')
    .or(orConditions)
    .limit(limit);

  if (error) {
    console.error('Error fetching wines by type:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch wines by grape variety (pinot noir, chardonnay, etc.)
 */
export async function getWinesByVariety(
  variety: string,
  limit: number = 5
): Promise<Wine[]> {
  const client = getWineCatalogClient();

  const { data, error } = await client
    .from('wine_catalog')
    .select('*')
    .ilike('variety', `%${variety}%`)
    .limit(limit);

  if (error) {
    console.error('Error fetching wines by variety:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch wines by region (Napa Valley, Burgundy, etc.)
 */
export async function getWinesByRegion(
  region: string,
  limit: number = 5
): Promise<Wine[]> {
  const client = getWineCatalogClient();

  const { data, error } = await client
    .from('wine_catalog')
    .select('*')
    .or(`region.ilike.%${region}%,subregion.ilike.%${region}%`)
    .limit(limit);

  if (error) {
    console.error('Error fetching wines by region:', error);
    return [];
  }

  return data || [];
}

/**
 * Full-text search across wine catalog
 */
export async function searchWines(
  query: string,
  limit: number = 5
): Promise<Wine[]> {
  const client = getWineCatalogClient();

  // Try full-text search first
  const { data, error } = await client
    .from('wine_catalog')
    .select('*')
    .textSearch('search_tsv', query, { type: 'websearch' })
    .limit(limit);

  if (error) {
    console.error('Error searching wines:', error);
    // Fallback to ilike search
    return fallbackSearch(query, limit);
  }

  if (!data || data.length === 0) {
    return fallbackSearch(query, limit);
  }

  return data;
}

async function fallbackSearch(query: string, limit: number): Promise<Wine[]> {
  const client = getWineCatalogClient();

  const { data, error } = await client
    .from('wine_catalog')
    .select('*')
    .or(`producer.ilike.%${query}%,wine_name.ilike.%${query}%,variety.ilike.%${query}%,region.ilike.%${query}%`)
    .limit(limit);

  if (error) {
    console.error('Error in fallback search:', error);
    return [];
  }

  return data || [];
}

/**
 * Get random wines (for variety in recommendations)
 */
export async function getRandomWines(
  limit: number = 5,
  wineType?: string
): Promise<Wine[]> {
  const client = getWineCatalogClient();

  let query = client
    .from('wine_catalog')
    .select('*');

  if (wineType) {
    const varietiesToSearch = getVarietiesForWineType(wineType);
    if (varietiesToSearch.length > 0) {
      const orConditions = varietiesToSearch.map(v => `variety.ilike.%${v}%`).join(',');
      query = query.or(orConditions);
    }
  }

  // Get more wines than needed, then shuffle
  const { data, error } = await query.limit(limit * 10);

  if (error) {
    console.error('Error fetching random wines:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Shuffle and take requested amount
  const shuffled = data.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Smart Wine Matching for Article Generation
// ---------------------------------------------------------------------------

/**
 * Extract wine-related terms from a keyword/topic
 */
function extractWineTerms(keyword: string): {
  wineTypes: string[];
  varieties: string[];
  regions: string[];
  styles: string[];
  explicitWineType: boolean; // Flag to indicate if wine type was explicitly mentioned
} {
  const lowerKeyword = keyword.toLowerCase();

  const wineTypes: string[] = [];
  const varieties: string[] = [];
  const regions: string[] = [];
  const styles: string[] = [];
  let explicitWineType = false;

  // Wine types - check for explicit mentions
  if (lowerKeyword.includes('red wine') || (lowerKeyword.includes('red') && lowerKeyword.includes('wine'))) {
    wineTypes.push('red');
    explicitWineType = true;
  }
  if (lowerKeyword.includes('white wine') || (lowerKeyword.includes('white') && lowerKeyword.includes('wine'))) {
    wineTypes.push('white');
    explicitWineType = true;
  }
  if (lowerKeyword.includes('rosé') || lowerKeyword.includes('rose wine') || (lowerKeyword.includes('rose') && lowerKeyword.includes('wine'))) {
    wineTypes.push('rosé');
    explicitWineType = true;
  }
  if (lowerKeyword.includes('sparkling') || lowerKeyword.includes('champagne')) {
    wineTypes.push('sparkling');
    explicitWineType = true;
  }
  if (lowerKeyword.includes('orange wine') || (lowerKeyword.includes('orange') && lowerKeyword.includes('wine'))) {
    wineTypes.push('orange');
    explicitWineType = true;
  }
  if (lowerKeyword.includes('dessert') || lowerKeyword.includes('sweet wine')) {
    wineTypes.push('dessert');
    explicitWineType = true;
  }

  // Common varieties
  const varietyMap: Record<string, string> = {
    'pinot noir': 'Pinot Noir',
    'cabernet': 'Cabernet Sauvignon',
    'merlot': 'Merlot',
    'chardonnay': 'Chardonnay',
    'sauvignon blanc': 'Sauvignon Blanc',
    'riesling': 'Riesling',
    'syrah': 'Syrah',
    'shiraz': 'Shiraz',
    'zinfandel': 'Zinfandel',
    'malbec': 'Malbec',
    'tempranillo': 'Tempranillo',
    'sangiovese': 'Sangiovese',
    'nebbiolo': 'Nebbiolo',
    'grenache': 'Grenache',
    'viognier': 'Viognier',
    'gewürztraminer': 'Gewürztraminer',
    'pinot grigio': 'Pinot Grigio',
    'pinot gris': 'Pinot Gris',
    'moscato': 'Moscato',
    'prosecco': 'Prosecco',
  };

  for (const [key, value] of Object.entries(varietyMap)) {
    if (lowerKeyword.includes(key)) {
      varieties.push(value);
    }
  }

  // Regions - includes appellations that appear in wine names
  const regionMap: Record<string, string> = {
    'napa': 'Napa Valley',
    'sonoma': 'Sonoma',
    'burgundy': 'Burgundy',
    'bordeaux': 'Bordeaux',
    'champagne': 'Champagne',
    'tuscany': 'Tuscany',
    'piedmont': 'Piedmont',
    'rioja': 'Rioja',
    'barossa': 'Barossa Valley',
    'marlborough': 'Marlborough',
    'oregon': 'Oregon',
    'willamette': 'Willamette Valley',
    'rhône': 'Rhône',
    'rhone': 'Rhône',
    'loire': 'Loire Valley',
    'mosel': 'Mosel',
    'mendoza': 'Mendoza',
    // Italian appellations (these appear in wine names)
    'barbaresco': 'Barbaresco',
    'barolo': 'Barolo',
    'brunello': 'Brunello',
    'chianti': 'Chianti',
    'amarone': 'Amarone',
    'valpolicella': 'Valpolicella',
    'langhe': 'Langhe',
    // French appellations
    'chablis': 'Chablis',
    'sancerre': 'Sancerre',
    'côtes du rhône': 'Côtes du Rhône',
    'cotes du rhone': 'Côtes du Rhône',
    'châteauneuf': 'Châteauneuf-du-Pape',
    'chateauneuf': 'Châteauneuf-du-Pape',
    'saint-émilion': 'Saint-Émilion',
    'saint emilion': 'Saint-Émilion',
    'pomerol': 'Pomerol',
    'margaux': 'Margaux',
    'pauillac': 'Pauillac',
    // Spanish appellations
    'ribera del duero': 'Ribera del Duero',
    'priorat': 'Priorat',
  };

  // Map appellations to their typical grape varieties (for better matching)
  const appellationVarietyMap: Record<string, string> = {
    'barbaresco': 'Nebbiolo',
    'barolo': 'Nebbiolo',
    'brunello': 'Sangiovese',
    'chianti': 'Sangiovese',
    'amarone': 'Corvina',
    'valpolicella': 'Corvina',
    'chablis': 'Chardonnay',
    'sancerre': 'Sauvignon Blanc',
    'champagne': 'Chardonnay', // Also Pinot Noir/Meunier
    'châteauneuf-du-pape': 'Grenache',
  };

  // Check if keyword matches an appellation and add its variety
  for (const [appellation, variety] of Object.entries(appellationVarietyMap)) {
    if (lowerKeyword.includes(appellation)) {
      if (!varieties.includes(variety)) {
        varieties.push(variety);
      }
    }
  }

  // Country to regions mapping
  const countryRegionMap: Record<string, string[]> = {
    'italian': ['Piedmont', 'Tuscany'],
    'italy': ['Piedmont', 'Tuscany'],
    'french': ['Burgundy', 'Bordeaux', 'Champagne', 'Rhône', 'Loire Valley'],
    'france': ['Burgundy', 'Bordeaux', 'Champagne', 'Rhône', 'Loire Valley'],
    'spanish': ['Rioja'],
    'spain': ['Rioja'],
    'australian': ['Barossa Valley'],
    'australia': ['Barossa Valley'],
    'californian': ['Napa Valley', 'Sonoma', 'California'],
    'california': ['Napa Valley', 'Sonoma', 'California'],
    'american': ['Napa Valley', 'Sonoma', 'California', 'Oregon', 'Washington'],
    'german': ['Mosel'],
    'germany': ['Mosel'],
    'argentinian': ['Mendoza'],
    'argentina': ['Mendoza'],
    'new zealand': ['Marlborough'],
  };

  for (const [key, value] of Object.entries(regionMap)) {
    if (lowerKeyword.includes(key)) {
      regions.push(value);
    }
  }

  // Check for country names and add their regions
  for (const [country, countryRegions] of Object.entries(countryRegionMap)) {
    if (lowerKeyword.includes(country)) {
      regions.push(...countryRegions);
    }
  }

  // Styles
  if (lowerKeyword.includes('natural')) styles.push('natural');
  if (lowerKeyword.includes('organic')) styles.push('organic');
  if (lowerKeyword.includes('biodynamic')) styles.push('biodynamic');
  if (lowerKeyword.includes('cheap') || lowerKeyword.includes('budget') || lowerKeyword.includes('under')) styles.push('value');
  if (lowerKeyword.includes('premium') || lowerKeyword.includes('luxury')) styles.push('premium');

  // Food pairing keywords → suggest appropriate wine varieties
  // ONLY use these if no explicit wine type was mentioned
  const foodPairingMap: Record<string, string[]> = {
    'steak': ['Cabernet Sauvignon', 'Malbec', 'Syrah'],
    'beef': ['Cabernet Sauvignon', 'Malbec', 'Syrah'],
    'lamb': ['Cabernet Sauvignon', 'Syrah', 'Tempranillo'],
    'chicken': ['Chardonnay', 'Pinot Noir', 'Sauvignon Blanc'],
    'turkey': ['Pinot Noir', 'Zinfandel', 'Chardonnay'],
    'pork': ['Pinot Noir', 'Riesling', 'Zinfandel'],
    'salmon': ['Pinot Noir', 'Chardonnay', 'Sauvignon Blanc'],
    'fish': ['Sauvignon Blanc', 'Chardonnay', 'Pinot Grigio'],
    'seafood': ['Sauvignon Blanc', 'Chardonnay', 'Champagne Blend'],
    'pasta': ['Sangiovese', 'Barbera', 'Pinot Grigio'],
    'pizza': ['Sangiovese', 'Barbera', 'Zinfandel'],
    'cheese': ['Cabernet Sauvignon', 'Chardonnay', 'Sauvignon Blanc'],
    'thanksgiving': ['Pinot Noir', 'Zinfandel', 'Chardonnay'],
    'bbq': ['Zinfandel', 'Syrah', 'Malbec'],
    'barbecue': ['Zinfandel', 'Syrah', 'Malbec'],
  };

  // Only check for food pairing keywords if NO explicit wine type was mentioned
  // This prevents "rosé wine with chicken" from suggesting Chardonnay instead of rosé
  if (!explicitWineType) {
    for (const [food, pairingVarieties] of Object.entries(foodPairingMap)) {
      if (lowerKeyword.includes(food)) {
        for (const variety of pairingVarieties) {
          if (!varieties.includes(variety)) {
            varieties.push(variety);
          }
        }
        break; // Use first match
      }
    }
  }

  return { wineTypes, varieties, regions, styles, explicitWineType };
}

/**
 * Search wines by appellation name (e.g., "Barbaresco" in wine_name)
 */
async function getWinesByAppellation(
  appellation: string,
  limit: number = 5
): Promise<Wine[]> {
  const client = getWineCatalogClient();

  const { data, error } = await client
    .from('wine_catalog')
    .select('*')
    .ilike('wine_name', `%${appellation}%`)
    .limit(limit);

  if (error) {
    console.error('Error fetching wines by appellation:', error);
    return [];
  }

  return data || [];
}

/**
 * Get relevant wines for a given keyword/article topic
 * This is the main function to use for article generation
 *
 * IMPORTANT: Returns empty array if no matching wines found
 * Never returns random/unrelated wines
 */
export async function getWinesForKeyword(
  keyword: string,
  count: number = 3
): Promise<WineRecommendation[]> {
  const terms = extractWineTerms(keyword);
  let wines: Wine[] = [];

  // List of appellations that appear in wine names (not region field)
  const appellations = ['barbaresco', 'barolo', 'brunello', 'chianti', 'amarone',
    'valpolicella', 'chablis', 'sancerre', 'champagne', 'châteauneuf'];

  const lowerKeyword = keyword.toLowerCase();

  // Priority 0 (NEW): If explicit wine type is mentioned (e.g., "rosé wine with chicken"),
  // prioritize the wine type FIRST before anything else
  if (terms.explicitWineType && terms.wineTypes.length > 0) {
    for (const wineType of terms.wineTypes) {
      const typeWines = await getWinesByType(wineType, count - wines.length);
      wines.push(...typeWines);
      if (wines.length >= count) break;
    }
  }

  // Priority 1: Search by appellation in wine_name (for Italian/French wines)
  if (wines.length < count) {
    for (const appellation of appellations) {
      if (lowerKeyword.includes(appellation)) {
        const appellationWines = await getWinesByAppellation(appellation, count - wines.length);
        wines.push(...appellationWines);
        break; // Found appellation match, don't search others
      }
    }
  }

  // Priority 2: Search by variety (most specific for varietal articles)
  if (wines.length < count && terms.varieties.length > 0) {
    for (const variety of terms.varieties) {
      const varietyWines = await getWinesByVariety(variety, count - wines.length);
      wines.push(...varietyWines);
    }
  }

  // Priority 3: Search by region
  if (wines.length < count && terms.regions.length > 0) {
    for (const region of terms.regions) {
      const regionWines = await getWinesByRegion(region, count - wines.length);
      wines.push(...regionWines);
    }
  }

  // Priority 4: Search by wine type (for non-explicit cases where we have partial matches)
  if (wines.length < count && wines.length > 0 && terms.wineTypes.length > 0 && !terms.explicitWineType) {
    for (const wineType of terms.wineTypes) {
      const typeWines = await getWinesByType(wineType, count - wines.length);
      wines.push(...typeWines);
    }
  }

  // Priority 5: Full-text search with the keyword (but only add if relevant)
  if (wines.length < count) {
    const searchWinesResult = await searchWines(keyword, count - wines.length);
    // Only add search results if they seem relevant (have matching region/variety)
    const relevantResults = searchWinesResult.filter(wine => {
      const wineStr = `${wine.producer} ${wine.wine_name} ${wine.region} ${wine.variety}`.toLowerCase();
      // Check if wine matches any of our search terms
      return terms.varieties.some(v => wineStr.includes(v.toLowerCase())) ||
             terms.regions.some(r => wineStr.includes(r.toLowerCase())) ||
             terms.wineTypes.some(t => wineStr.includes(t.toLowerCase())) ||
             appellations.some(a => lowerKeyword.includes(a) && wineStr.includes(a));
    });
    wines.push(...relevantResults);
  }

  // NO RANDOM FALLBACK - We only return wines that actually match
  // If we don't have matching wines, the article should not show wine picks

  // Remove duplicates and limit to count
  const uniqueWines = wines.filter((wine, index, self) =>
    index === self.findIndex(w => w.id === wine.id)
  ).slice(0, count);

  // Transform to recommendation format
  return uniqueWines.map(wine => transformToRecommendation(wine, keyword));
}

/**
 * Transform a Wine record into a WineRecommendation with generated tasting notes
 */
function transformToRecommendation(wine: Wine, keyword: string): WineRecommendation {
  const fullName = wine.vintage
    ? `${wine.vintage} ${wine.producer} ${wine.wine_name}`
    : `${wine.producer} ${wine.wine_name}`;

  const region = wine.subregion
    ? `${wine.subregion}, ${wine.region || 'Unknown Region'}`
    : wine.region || 'Unknown Region';

  // Infer wine type from variety
  const wineType = inferWineType(wine.variety);

  // Generate contextual tasting notes based on variety and type
  const notes = generateTastingNotes(wine, keyword);

  return {
    name: fullName,
    producer: wine.producer,
    region,
    vintage: wine.vintage,
    variety: wine.variety,
    wine_type: wineType,
    notes,
  };
}

/**
 * Generate contextual tasting notes based on wine characteristics
 */
function generateTastingNotes(wine: Wine, keyword: string): string {
  const variety = wine.variety?.toLowerCase() || '';
  const wineType = inferWineType(wine.variety);
  const region = wine.region?.toLowerCase() || '';

  // Variety-specific notes
  const varietyNotes: Record<string, string[]> = {
    'pinot noir': [
      'Elegant with bright cherry and raspberry notes, silky tannins, and earthy undertones.',
      'Delicate red fruit aromas with hints of mushroom and forest floor.',
      'Light-bodied with vibrant acidity and a long, refined finish.',
    ],
    'cabernet sauvignon': [
      'Bold and structured with blackcurrant, cedar, and tobacco notes.',
      'Full-bodied with firm tannins and notes of dark fruit and oak.',
      'Rich cassis and plum flavors with hints of graphite and spice.',
    ],
    'chardonnay': [
      'Rich and buttery with notes of tropical fruit and vanilla.',
      'Crisp apple and citrus with balanced oak and a creamy texture.',
      'Elegant with stone fruit, subtle minerality, and a long finish.',
    ],
    'sauvignon blanc': [
      'Crisp and refreshing with grapefruit, lime, and herbaceous notes.',
      'Zesty citrus and tropical fruit with bright acidity.',
      'Clean and aromatic with notes of green apple and fresh-cut grass.',
    ],
    'merlot': [
      'Soft and approachable with plum, cherry, and chocolate notes.',
      'Velvety texture with ripe berry fruit and hints of herbs.',
      'Medium-bodied with supple tannins and a smooth finish.',
    ],
    'riesling': [
      'Aromatic with peach, apricot, and floral notes with bright acidity.',
      'Off-dry with honeyed citrus and mineral undertones.',
      'Vibrant and refreshing with green apple and petrol notes.',
    ],
    'syrah': [
      'Dark and intense with blackberry, pepper, and smoky notes.',
      'Full-bodied with rich dark fruit and savory spice.',
      'Bold and complex with notes of black olive and leather.',
    ],
  };

  // Check for variety match
  for (const [key, notes] of Object.entries(varietyNotes)) {
    if (variety.includes(key)) {
      return notes[Math.floor(Math.random() * notes.length)];
    }
  }

  // Generic notes by wine type
  const typeNotes: Record<string, string[]> = {
    'red': [
      'Well-balanced with ripe fruit, integrated tannins, and a lingering finish.',
      'Rich and expressive with dark fruit character and subtle oak influence.',
      'Medium to full-bodied with layers of fruit and spice.',
    ],
    'white': [
      'Fresh and aromatic with citrus and stone fruit notes.',
      'Clean and crisp with balanced acidity and mineral undertones.',
      'Light and refreshing with bright fruit character.',
    ],
    'rosé': [
      'Dry and refreshing with strawberry and watermelon notes.',
      'Crisp and fruity with delicate floral aromatics.',
      'Light-bodied with red berry fruit and a clean finish.',
    ],
    'sparkling': [
      'Fine bubbles with notes of brioche, apple, and citrus.',
      'Elegant and festive with persistent effervescence.',
      'Crisp and refreshing with toasty notes and bright acidity.',
    ],
    'orange': [
      'Textured and complex with dried apricot and tea-like tannins.',
      'Amber-hued with oxidative notes and a grippy finish.',
      'Unique skin-contact character with honey and spice notes.',
    ],
  };

  for (const [key, notes] of Object.entries(typeNotes)) {
    if (wineType.includes(key)) {
      return notes[Math.floor(Math.random() * notes.length)];
    }
  }

  // Default fallback
  return 'Well-crafted with balanced fruit, structure, and a satisfying finish.';
}

/**
 * Get additional wines for article enrichment, excluding already-mentioned wines
 * This is the main function to use for enrichment (vs getWinesForKeyword for generation)
 *
 * @param keyword - The article topic/keyword
 * @param existingWines - Names of wines already in the article to exclude
 * @param count - Number of wines to return (default: 5)
 * @returns Array of wine recommendations, excluding duplicates
 */
export async function getAdditionalWinesForArticle(
  keyword: string,
  existingWines: string[],
  count: number = 5
): Promise<WineRecommendation[]> {
  // Get more wines than needed to filter out duplicates
  const wines = await getWinesForKeyword(keyword, count + existingWines.length + 5);

  if (wines.length === 0) {
    return [];
  }

  // Normalize existing wine names for comparison
  const existingNormalized = existingWines.map(w =>
    w.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  // Filter out wines that are already in the article
  const newWines = wines.filter(wine => {
    const wineNormalized = wine.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const producerNormalized = wine.producer.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check if this wine or producer is already mentioned
    return !existingNormalized.some(existing =>
      wineNormalized.includes(existing) ||
      existing.includes(wineNormalized) ||
      existing.includes(producerNormalized)
    );
  });

  return newWines.slice(0, count);
}

/**
 * Check if a specific wine exists in the catalog
 * Used for validation purposes
 *
 * @param wineName - The wine name to search for
 * @returns true if wine exists in catalog, false otherwise
 */
export async function wineExistsInCatalog(wineName: string): Promise<boolean> {
  const results = await searchWines(wineName, 1);
  if (results.length === 0) {
    return false;
  }

  // Check if the result is a close match
  const resultName = `${results[0].producer} ${results[0].wine_name}`.toLowerCase();
  const searchName = wineName.toLowerCase();

  // Fuzzy match - at least the producer or wine name should match
  return resultName.includes(searchName.split(' ')[0]) ||
         searchName.includes(results[0].producer.toLowerCase()) ||
         searchName.includes(results[0].wine_name.toLowerCase());
}

/**
 * Validate multiple wines against the catalog
 *
 * @param wineNames - Array of wine names to validate
 * @returns Object with valid and invalid wine lists
 */
export async function validateWinesInCatalog(
  wineNames: string[]
): Promise<{ valid: string[]; invalid: string[] }> {
  if (wineNames.length === 0) {
    return { valid: [], invalid: [] };
  }

  // De-duplicate input to reduce duplicate lookups while preserving final output order
  const uniqueNames = Array.from(new Set(wineNames));
  const lookupResults = new Map<string, boolean>();
  const concurrency = 8;
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, uniqueNames.length) }, async () => {
    while (nextIndex < uniqueNames.length) {
      const index = nextIndex++;
      const name = uniqueNames[index];
      const exists = await wineExistsInCatalog(name);
      lookupResults.set(name, exists);
    }
  });

  await Promise.all(workers);

  const valid: string[] = [];
  const invalid: string[] = [];

  for (const name of uniqueNames) {
    const exists = lookupResults.get(name) === true;
    if (exists) {
      valid.push(name);
    } else {
      invalid.push(name);
    }
  }

  return { valid, invalid };
}

/**
 * Test the wine catalog connection
 */
export async function testWineCatalogConnection(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const client = getWineCatalogClient();

    const { count, error } = await client
      .from('wine_catalog')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
