/**
 * Enhanced Image Generation for Wine Articles
 * Intelligent prompt generation with SEO-optimized alt text
 */

import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// Wine color detection patterns
const WINE_COLORS = {
  red: [
    'cabernet', 'merlot', 'pinot noir', 'syrah', 'shiraz', 'malbec',
    'zinfandel', 'sangiovese', 'tempranillo', 'nebbiolo', 'grenache',
    'mourvèdre', 'barbera', 'chianti', 'bordeaux', 'barolo', 'rioja',
    'red wine', 'red blend',
  ],
  white: [
    'chardonnay', 'sauvignon blanc', 'pinot grigio', 'pinot gris',
    'riesling', 'gewürztraminer', 'viognier', 'chenin blanc',
    'albariño', 'grüner veltliner', 'white wine', 'white blend',
    'chablis', 'sancerre', 'muscadet',
  ],
  rosé: [
    'rosé', 'rose wine', 'pink wine', 'provence', 'rosado',
  ],
  sparkling: [
    'champagne', 'prosecco', 'cava', 'sparkling', 'crémant',
    'franciacorta', 'sekt', 'pet nat', 'pétillant', 'bubbles',
  ],
  dessert: [
    'port', 'sherry', 'madeira', 'sauternes', 'tokaji', 'ice wine',
    'late harvest', 'moscato', 'vin santo', 'dessert wine',
  ],
  orange: [
    'orange wine', 'skin contact', 'amber wine',
  ],
};

// Region-specific aesthetic elements
const REGION_AESTHETICS = {
  bordeaux: 'French château in background, elegant Bordeaux estate, formal gardens',
  burgundy: 'rolling Burgundian hills, traditional stone winery, rustic French elegance',
  champagne: 'prestigious champagne house, chalk cellars atmosphere, celebratory mood',
  tuscany: 'Tuscan cypress trees, terracotta rooftops, warm Italian countryside',
  piedmont: 'Piedmont hills, Alba truffle country, foggy morning vineyard',
  napa: 'Napa Valley golden hills, modern California winery architecture, sunset glow',
  sonoma: 'Sonoma coast fog, redwood forests, artisanal winery setting',
  oregon: 'Pacific Northwest evergreens, misty morning vineyard, cool climate elegance',
  rioja: 'Spanish bodega, ancient oak barrels, warm Mediterranean light',
  argentina: 'Andes mountains backdrop, Mendoza vineyard, high altitude wine country',
  newzealand: 'Marlborough valley, pristine landscape, crisp clean atmosphere',
  australia: 'Australian outback vineyard, eucalyptus trees, bold sunshine',
  germany: 'steep Mosel valley slopes, romantic Rhine castle, German precision',
  portugal: 'Douro valley terraces, Port wine lodges, Atlantic coastal influence',
};

// Setting/occasion elements
const OCCASION_AESTHETICS = {
  dinner: 'elegant dinner table, candlelight ambiance, fine dining setting, white tablecloth',
  casual: 'relaxed outdoor patio, natural daylight, wooden farmhouse table',
  celebration: 'festive party atmosphere, champagne toast, joyful gathering',
  romantic: 'intimate candlelit setting, roses, romantic date night ambiance',
  pairing: 'gourmet food spread, artfully arranged dishes, wine and food harmony',
  tasting: 'professional tasting room, multiple wine glasses lined up, sommelier setting',
  picnic: 'outdoor vineyard picnic, wicker basket, sunny afternoon',
  holiday: 'festive holiday table, seasonal decorations, family gathering warmth',
};

// Food pairing visuals
const FOOD_VISUALS = {
  steak: 'perfectly seared ribeye steak, herb butter, rustic steakhouse',
  chicken: 'golden roasted chicken, herbs, comfortable home cooking',
  salmon: 'fresh salmon fillet, citrus garnish, coastal freshness',
  seafood: 'fresh seafood platter, oysters, coastal restaurant elegance',
  pasta: 'handmade Italian pasta, rich sauce, trattoria warmth',
  cheese: 'artisan cheese board, variety of cheeses, crackers and fruit',
  pizza: 'wood-fired pizza, melted cheese, Italian pizzeria',
  thanksgiving: 'Thanksgiving turkey, fall harvest table, warm family gathering',
  christmas: 'Christmas dinner spread, festive decorations, holiday warmth',
};

/**
 * Detect wine color from keyword
 */
export function detectWineColor(keyword: string): keyof typeof WINE_COLORS | 'generic' {
  const kw = keyword.toLowerCase();

  for (const [color, patterns] of Object.entries(WINE_COLORS)) {
    if (patterns.some(p => kw.includes(p))) {
      return color as keyof typeof WINE_COLORS;
    }
  }

  return 'generic';
}

/**
 * Detect region from keyword
 */
export function detectRegion(keyword: string): string | null {
  const kw = keyword.toLowerCase();

  for (const region of Object.keys(REGION_AESTHETICS)) {
    if (kw.includes(region)) {
      return region;
    }
  }

  // Additional region checks
  if (kw.includes('california') || kw.includes('napa')) return 'napa';
  if (kw.includes('french') || kw.includes('france')) return 'bordeaux';
  if (kw.includes('italian') || kw.includes('italy')) return 'tuscany';
  if (kw.includes('spanish') || kw.includes('spain')) return 'rioja';

  return null;
}

/**
 * Detect setting/occasion from keyword
 */
export function detectOccasion(keyword: string): string | null {
  const kw = keyword.toLowerCase();

  // Check for food pairings first
  for (const food of Object.keys(FOOD_VISUALS)) {
    if (kw.includes(food)) {
      return 'pairing';
    }
  }

  // Check for occasions
  if (kw.includes('thanksgiving')) return 'holiday';
  if (kw.includes('christmas') || kw.includes('holiday')) return 'holiday';
  if (kw.includes('wedding') || kw.includes('celebration')) return 'celebration';
  if (kw.includes('date') || kw.includes('romantic')) return 'romantic';
  if (kw.includes('dinner')) return 'dinner';
  if (kw.includes('picnic') || kw.includes('outdoor')) return 'picnic';
  if (kw.includes('tasting')) return 'tasting';
  if (kw.includes('pairing') || kw.includes('with ')) return 'pairing';

  return null;
}

/**
 * Detect specific food from keyword
 */
export function detectFood(keyword: string): string | null {
  const kw = keyword.toLowerCase();

  for (const food of Object.keys(FOOD_VISUALS)) {
    if (kw.includes(food)) {
      return food;
    }
  }

  return null;
}

/**
 * Generate intelligent image prompt based on keyword analysis
 */
export function generateImagePrompt(keyword: string): string {
  const wineColor = detectWineColor(keyword);
  const region = detectRegion(keyword);
  const occasion = detectOccasion(keyword);
  const food = detectFood(keyword);

  // Base wine visual
  const wineVisuals: Record<string, string> = {
    red: 'elegant crystal wine glass filled with deep ruby red wine, rich burgundy color, soft light catching the wine',
    white: 'crisp white wine in elegant glass, golden straw color, light condensation on glass, refreshing appearance',
    rosé: 'beautiful pink rosé wine in stemmed glass, salmon-pink hue, summer freshness',
    sparkling: 'champagne flute with golden bubbles rising elegantly, effervescent sparkle, celebratory mood',
    dessert: 'amber dessert wine in small tulip glass, rich golden color, luxurious viscosity',
    orange: 'amber-hued orange wine in glass, natural winemaking aesthetic, rustic artisan feel',
    generic: 'elegant wine glass on sophisticated table, professional wine photography',
  };

  const baseVisual = wineVisuals[wineColor] || wineVisuals.generic;

  // Build prompt components
  const components: string[] = [baseVisual];

  // Add food if detected
  if (food && FOOD_VISUALS[food as keyof typeof FOOD_VISUALS]) {
    components.push(FOOD_VISUALS[food as keyof typeof FOOD_VISUALS]);
  }

  // Add region aesthetic if detected
  if (region && REGION_AESTHETICS[region as keyof typeof REGION_AESTHETICS]) {
    components.push(REGION_AESTHETICS[region as keyof typeof REGION_AESTHETICS]);
  }

  // Add occasion if detected
  if (occasion && OCCASION_AESTHETICS[occasion as keyof typeof OCCASION_AESTHETICS]) {
    components.push(OCCASION_AESTHETICS[occasion as keyof typeof OCCASION_AESTHETICS]);
  }

  // Add quality modifiers
  components.push('professional wine photography, 8k quality, shallow depth of field, warm ambient lighting');

  return components.join(', ') + ' --ar 16:9';
}

/**
 * Generate SEO-optimized alt text for the image
 */
export function generateAltText(keyword: string, title: string): string {
  const wineColor = detectWineColor(keyword);
  const food = detectFood(keyword);
  const region = detectRegion(keyword);

  let altText = '';

  if (food) {
    altText = `${title} - Professional photo of ${wineColor !== 'generic' ? wineColor + ' ' : ''}wine paired with ${food}`;
  } else if (region) {
    altText = `${title} - ${region.charAt(0).toUpperCase() + region.slice(1)} wine photography with regional vineyard aesthetic`;
  } else if (wineColor !== 'generic') {
    altText = `${title} - Elegant ${wineColor} wine in crystal glass with professional lighting`;
  } else {
    altText = `${title} - Expert wine guide featured image with professional wine photography`;
  }

  return altText;
}

/**
 * Generate image caption for structured data
 */
export function generateCaption(keyword: string): string {
  const wineColor = detectWineColor(keyword);
  const food = detectFood(keyword);

  if (food) {
    return `Discover the perfect wine pairing for ${food} with our expert sommelier recommendations.`;
  }

  if (wineColor !== 'generic') {
    return `Explore our curated selection of ${wineColor} wines with expert tasting notes and recommendations.`;
  }

  return `Expert wine recommendations from certified sommeliers to elevate your wine experience.`;
}

/**
 * Download image from URL to local file
 */
export async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    const protocol = url.startsWith("https") ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location as string, filepath).then(resolve).catch(reject);
        return;
      }

      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

/**
 * Generate and save article image using Replicate
 */
export async function generateArticleImage(
  slug: string,
  keyword: string,
  replicateToken?: string
): Promise<{ success: boolean; altText: string; caption: string }> {
  const folderPath = path.join(process.cwd(), 'src/assets/images/articles');
  const filepath = path.join(folderPath, `${slug}.png`);

  // Generate alt text and caption regardless of image generation
  const title = keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const altText = generateAltText(keyword, title);
  const caption = generateCaption(keyword);

  // Skip if already exists
  if (fs.existsSync(filepath)) {
    console.log(`   ⏭️  Image ${slug}.png already exists`);
    return { success: true, altText, caption };
  }

  // Check for Replicate token
  if (!replicateToken) {
    console.log(`   ⚠️  No REPLICATE_API_TOKEN - skipping image generation`);
    return { success: false, altText, caption };
  }

  // Ensure folder exists
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  console.log(`   🎨 Generating image for ${slug}...`);

  try {
    const replicate = new Replicate({ auth: replicateToken });
    const prompt = generateImagePrompt(keyword);

    console.log(`   📝 Prompt: ${prompt.substring(0, 100)}...`);

    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: "16:9",
          output_format: "png",
          output_quality: 90,
        }
      }
    );

    const imageUrl = String((output as any)[0]);
    await downloadImage(imageUrl, filepath);
    console.log(`   ✅ Saved ${slug}.png`);

    return { success: true, altText, caption };

  } catch (error: any) {
    console.error(`   ❌ Failed to generate image: ${error.message}`);
    return { success: false, altText, caption };
  }
}

export default {
  generateImagePrompt,
  generateAltText,
  generateCaption,
  generateArticleImage,
  downloadImage,
  detectWineColor,
  detectRegion,
  detectOccasion,
  detectFood,
};
