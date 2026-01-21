/**
 * Generate Articles for Top Priority Keywords
 * Avoids duplicates by checking existing pages
 * Includes AI image generation via Replicate
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import Replicate from 'replicate';

config({ path: '.env.local', override: true });

// Dynamic import for wine catalog
const { getWinesForKeyword } = await import('../lib/wine-catalog.js');
import { getRandomAuthor, getAuthorSchema } from '../data/authors.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Replicate for image generation
let replicate: Replicate | null = null;
const replicateToken = process.env.REPLICATE_API_TOKEN;
if (replicateToken) {
  replicate = new Replicate({ auth: replicateToken });
  console.log('🎨 Image generation enabled (Replicate)\n');
} else {
  console.log('⚠️  REPLICATE_API_TOKEN not set - images will not be generated\n');
}

// Image generation functions
function generateImagePrompt(keyword: string): string {
  const lowerKeyword = keyword.toLowerCase();

  if (lowerKeyword.includes('champagne')) {
    return `elegant champagne bottles and glasses, golden bubbles, celebration setting, luxury wine photography, warm ambient lighting, professional photography --ar 16:9`;
  }
  if (lowerKeyword.includes('bordeaux')) {
    return `elegant bordeaux wine bottles and glasses, deep red wine, french chateau aesthetic, professional wine photography, warm lighting --ar 16:9`;
  }
  if (lowerKeyword.includes('burgundy')) {
    return `burgundy wine in crystal glass, pinot noir, french vineyard aesthetic, elegant wine cellar setting, professional photography --ar 16:9`;
  }
  if (lowerKeyword.includes('barolo')) {
    return `italian barolo wine bottles and glasses, piedmont vineyard, nebbiolo grapes, rustic italian setting, professional wine photography --ar 16:9`;
  }
  if (lowerKeyword.includes('napa') || lowerKeyword.includes('california')) {
    return `california wine country, napa valley vineyard, elegant wine glasses, golden hour lighting, professional wine photography --ar 16:9`;
  }
  if (lowerKeyword.includes('cabernet')) {
    return `elegant glass of deep red cabernet sauvignon wine, professional wine photography, dark moody background, soft lighting highlighting wine color --ar 16:9`;
  }
  if (lowerKeyword.includes('pinot noir')) {
    return `delicate glass of pinot noir, light ruby red color, professional wine photography, soft natural lighting, burgundy vineyard atmosphere --ar 16:9`;
  }
  if (lowerKeyword.includes('thanksgiving') || lowerKeyword.includes('pairing')) {
    return `elegant wine and food pairing spread, multiple wine glasses with different wines, thanksgiving dinner setting, professional food photography, warm inviting atmosphere --ar 16:9`;
  }

  return `elegant wine glass on sophisticated table setting, professional wine photography, warm ambient lighting, burgundy accents, clean minimal composition --ar 16:9`;
}

async function downloadImage(url: string, filepath: string): Promise<void> {
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

async function generateArticleImage(slug: string, keyword: string): Promise<boolean> {
  if (!replicate) {
    return false;
  }

  const folderPath = path.join(process.cwd(), 'src/assets/images/articles');
  const filepath = path.join(folderPath, `${slug}.png`);

  // Skip if already exists
  if (fs.existsSync(filepath)) {
    console.log(`   ⏭️  Image ${slug}.png already exists`);
    return true;
  }

  // Ensure folder exists
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  console.log(`   🎨 Generating image for ${slug}...`);

  try {
    const prompt = generateImagePrompt(keyword);
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
    return true;

  } catch (error: any) {
    console.error(`   ❌ Failed to generate image for ${slug}:`, error.message);
    return false;
  }
}

// Normalize a keyword/slug to its core topic for duplicate detection
function normalizeToCoreTopic(text: string): string {
  return text
    .toLowerCase()
    .replace(/\.(astro|mdx)$/, '')
    // Remove common prefixes/suffixes that don't change the topic
    .replace(/^(best-|top-|ultimate-|complete-|expert-)/g, '')
    .replace(/(-guide|-recommendations|-basics|-explained|-101|-tips)$/g, '')
    // Normalize pairing variations to a standard format
    .replace(/^(wine-with-|best-wine-with-|what-wine-goes-with-|what-to-eat-with-)/, 'pairing-')
    .replace(/(-wine-pairing|-food-pairing|-pairing)$/, '')
    // Handle "X food pairing" -> "pairing-X"
    .replace(/^([a-z-]+)-food-pairing$/, 'pairing-$1')
    // Normalize wine guide variations
    .replace(/^([a-z-]+)-wine-guide$/, '$1-wine')
    .replace(/^([a-z-]+)-wine$/, '$1')
    // Remove duplicate words
    .replace(/(\b\w+\b)(?=.*\b\1\b)/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
}

// Get existing page slugs AND their normalized topics
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
          // Also track the normalized topic
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

// Check if a keyword would create a duplicate article
function isDuplicateTopic(keyword: string, existingTopics: Set<string>): boolean {
  const newTopic = normalizeToCoreTopic(keywordToSlug(keyword));
  return existingTopics.has(newTopic);
}

// Convert keyword to slug
function keywordToSlug(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Determine category for keyword
function determineCategory(keyword: string): 'learn' | 'wine-pairings' | 'buy' {
  const lowerKw = keyword.toLowerCase();

  if (lowerKw.includes('pairing') || lowerKw.includes('with ') || lowerKw.includes('food')) {
    return 'wine-pairings';
  }
  if (lowerKw.includes('buy') || lowerKw.includes('price') || lowerKw.includes('for sale') || lowerKw.includes('under $') || lowerKw.includes('under 20') || lowerKw.includes('under 50')) {
    return 'buy';
  }
  return 'learn';
}

// Generate article content with optional featured image
function generateArticleContent(keyword: string, wines: any[], author: any, slug: string, hasImage: boolean): string {
  const title = keyword
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const description = `Discover the best ${keyword}. Expert recommendations, tasting notes, and tips from certified sommeliers.`;

  const today = new Date().toISOString().split('T')[0];

  // Build imports
  const imports = [`import ArticleLayout from '../../layouts/ArticleLayout.astro';`];
  if (hasImage) {
    imports.push(`import featuredImage from '../../assets/images/articles/${slug}.png';`);
  }

  // Build layout props
  const layoutProps = [
    `title={frontmatter.title}`,
    `description={frontmatter.description}`,
    `author={frontmatter.author}`,
    `readTime={frontmatter.readTime}`,
    `category="Wine Guide"`,
    `schema={frontmatter.structured_data}`
  ];
  if (hasImage) {
    layoutProps.push(`featuredImage={featuredImage}`);
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": `${title} - Expert Guide`,
    "description": description,
    "author": {
      "@type": "Person",
      "name": author.name,
      "jobTitle": author.role
    },
    "datePublished": new Date().toISOString(),
    "dateModified": new Date().toISOString()
  };

  const content = `---
${imports.join('\n')}

const frontmatter = {
  title: "${title} - Expert Guide",
  description: "${description}",
  pubDate: "${today}",
  author: "${author.name}",
  authorRole: "${author.role}",
  authorSlug: "${author.slug}",
  readTime: "5 min",
  keywords: ["${keyword}", "${keyword.split(' ').join('", "')}", "wine guide"],
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
    <p><strong>Quick Answer:</strong> ${generateQuickAnswer(keyword)}</p>
  </div>

  <h2>Understanding ${title}</h2>
  <p>${generateIntro(keyword)}</p>

  <h2>Our Top Picks</h2>
  ${generateWineHTML(wines)}

  <h2>Expert Tips</h2>
  ${generateExpertTipsHTML(keyword)}

  <h2>Frequently Asked Questions</h2>
  ${generateFAQHTML(keyword)}

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

function generateIntro(keyword: string): string {
  const intros = [
    `Finding the perfect ${keyword} can transform your dining experience. Whether you're planning a special occasion or simply enjoying a quiet evening at home, the right wine pairing makes all the difference.`,
    `When it comes to ${keyword}, quality matters more than price. Our team of sommeliers has tasted hundreds of options to bring you these expert recommendations.`,
    `The world of ${keyword} offers incredible diversity and complexity. In this guide, we'll help you navigate the options and find exactly what you're looking for.`,
  ];
  return intros[Math.floor(Math.random() * intros.length)];
}

function generateQuickAnswer(keyword: string): string {
  if (keyword.includes('pairing') || keyword.includes('with')) {
    return `For the best ${keyword}, look for wines with balanced acidity and complementary flavor profiles. Medium-bodied options often provide the most versatility.`;
  }
  if (keyword.includes('best')) {
    return `The best options combine quality, value, and availability. We recommend exploring wines from established producers with consistent track records.`;
  }
  return `Start with classic examples from renowned regions, then explore based on your personal preferences. Don't be afraid to try something new!`;
}

function generateExpertTips(keyword: string): string {
  return `
1. **Temperature matters** - Serve whites chilled (45-50°F) and reds slightly below room temperature (60-65°F)
2. **Decanting helps** - Give bold reds 30-60 minutes to open up
3. **Trust your palate** - The best wine is the one you enjoy most
4. **Consider the occasion** - Match wine intensity to food intensity
5. **Ask for help** - Wine professionals love sharing their knowledge
`;
}

function generateWineHTML(wines: any[]): string {
  // Note: Articles are only generated when wines.length > 0
  // This check is kept as a safety net
  if (wines.length === 0) {
    return '';
  }
  return wines.map((wine, i) => `
      <div class="bg-gray-50 rounded-lg p-6 mb-4">
        <h3 class="text-xl font-semibold text-wine-700 mb-2">${i + 1}. ${wine.name}</h3>
        <p class="text-gray-600 mb-2"><strong>Producer:</strong> ${wine.producer}</p>
        <p class="text-gray-600 mb-2"><strong>Region:</strong> ${wine.region}</p>
        <p class="text-gray-600 mb-2"><strong>Variety:</strong> ${wine.variety || 'Blend'}</p>
        <p class="text-gray-700 mt-3">${wine.notes}</p>
      </div>`).join('\n');
}

function generateExpertTipsHTML(keyword: string): string {
  return `
      <ol class="list-decimal list-inside space-y-3 text-gray-700">
        <li><strong>Temperature matters</strong> - Serve whites chilled (45-50°F) and reds slightly below room temperature (60-65°F)</li>
        <li><strong>Decanting helps</strong> - Give bold reds 30-60 minutes to open up</li>
        <li><strong>Trust your palate</strong> - The best wine is the one you enjoy most</li>
        <li><strong>Consider the occasion</strong> - Match wine intensity to food intensity</li>
        <li><strong>Ask for help</strong> - Wine professionals love sharing their knowledge</li>
      </ol>`;
}

function generateFAQ(keyword: string): string {
  return `
### What should I look for in ${keyword}?

Focus on balance, quality producers, and wines that match your taste preferences. Price isn't always an indicator of quality.

### How much should I spend?

Great options exist at every price point. For everyday enjoyment, $15-30 offers excellent value. For special occasions, explore the $40-80 range.

### How do I store wine properly?

Keep bottles on their side in a cool, dark place (55°F ideal). Avoid temperature fluctuations and direct sunlight.
`;
}

function generateFAQHTML(keyword: string): string {
  return `
      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold text-wine-700 mb-2">What should I look for in ${keyword}?</h3>
          <p class="text-gray-700">Focus on balance, quality producers, and wines that match your taste preferences. Price isn't always an indicator of quality.</p>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-wine-700 mb-2">How much should I spend?</h3>
          <p class="text-gray-700">Great options exist at every price point. For everyday enjoyment, $15-30 offers excellent value. For special occasions, explore the $40-80 range.</p>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-wine-700 mb-2">How do I store wine properly?</h3>
          <p class="text-gray-700">Keep bottles on their side in a cool, dark place (55°F ideal). Avoid temperature fluctuations and direct sunlight.</p>
        </div>
      </div>`;
}

async function generateArticles() {
  console.log('🍷 Generating Articles for Top Priority Keywords\n');

  // Get existing pages and their normalized topics
  const { slugs: existingSlugs, topics: existingTopics } = getExistingPages();
  console.log(`📄 Found ${existingSlugs.size} existing article slugs`);
  console.log(`🔍 Tracking ${existingTopics.size} unique topics for duplicate detection\n`);

  // Get top priority keywords that are active
  const { data: keywords, error } = await client
    .from('keyword_opportunities')
    .select('*')
    .eq('status', 'active')
    .gte('priority', 8)
    .order('search_volume', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching keywords:', error);
    return;
  }

  if (!keywords || keywords.length === 0) {
    console.log('No active high-priority keywords found');
    return;
  }

  console.log(`🎯 Found ${keywords.length} high-priority keywords (priority >= 8)\n`);

  // Filter out keywords that already have articles OR would be semantic duplicates
  const keywordsNeedingArticles = keywords.filter(kw => {
    const slug = keywordToSlug(kw.keyword);

    // Check exact slug match
    if (existingSlugs.has(slug)) {
      console.log(`  ⏭️  Skipping "${kw.keyword}" - exact article exists`);
      return false;
    }

    // Check semantic duplicate (same topic, different phrasing)
    if (isDuplicateTopic(kw.keyword, existingTopics)) {
      const topic = normalizeToCoreTopic(slug);
      console.log(`  ⏭️  Skipping "${kw.keyword}" - similar topic "${topic}" already covered`);
      return false;
    }

    return true;
  });

  console.log(`\n📝 ${keywordsNeedingArticles.length} keywords need articles\n`);

  if (keywordsNeedingArticles.length === 0) {
    console.log('✅ All high-priority keywords already have articles!');
    return;
  }

  // Generate articles for top 10 keywords needing articles
  const toGenerate = keywordsNeedingArticles.slice(0, 10);
  let generated = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < toGenerate.length; i++) {
    const kw = toGenerate[i];
    try {
      console.log(`\n🔄 Generating: "${kw.keyword}" (${kw.search_volume}/mo)`);

      const slug = keywordToSlug(kw.keyword);
      const category = determineCategory(kw.keyword);
      const filePath = path.join(process.cwd(), 'src/pages', category, `${slug}.astro`);

      // Check for matching wines FIRST - skip if none found
      const wines = await getWinesForKeyword(kw.keyword, 3);

      if (wines.length === 0) {
        console.log(`   ⏭️  Skipping - no matching wines in catalog`);
        skipped++;
        continue;
      }

      console.log(`   Found ${wines.length} wine recommendations`);

      // Generate image (only if we have wines to recommend)
      let hasImage = false;
      if (replicate) {
        hasImage = await generateArticleImage(slug, kw.keyword);
        // Rate limit delay (10s between image generations)
        if (hasImage && i < toGenerate.length - 1) {
          console.log(`   ⏳ Waiting 10s for rate limit...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }

      // Get author
      const author = getRandomAuthor();

      // Generate content with image support
      const content = generateArticleContent(kw.keyword, wines, author, slug, hasImage);

      // Write file
      fs.writeFileSync(filePath, content);
      console.log(`   ✅ Created: ${category}/${slug}.astro`);

      // Add this topic to existingTopics to prevent duplicates in same run
      existingTopics.add(normalizeToCoreTopic(slug));

      // Mark keyword as used
      await client
        .from('keyword_opportunities')
        .update({ status: 'used', used_at: new Date().toISOString() })
        .eq('keyword', kw.keyword);

      generated++;

    } catch (err) {
      console.error(`   ❌ Failed: ${err}`);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📋 GENERATION SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Generated: ${generated}`);
  console.log(`⏭️  Skipped (no wines): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total processed: ${toGenerate.length}`);

  // Show what was generated
  if (generated > 0) {
    console.log('\n📄 Articles Generated:');
    toGenerate.slice(0, generated).forEach(kw => {
      const category = determineCategory(kw.keyword);
      const slug = keywordToSlug(kw.keyword);
      console.log(`   - ${category}/${slug}.astro (${kw.search_volume}/mo)`);
    });
  }
}

generateArticles()
  .then(() => {
    console.log('\n✅ Article generation complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
