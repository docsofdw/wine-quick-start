/**
 * Generate Articles for Top Priority Keywords
 * Avoids duplicates by checking existing pages
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

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

// Get existing page slugs
function getExistingPages(): Set<string> {
  const pagesDir = path.join(process.cwd(), 'src/pages');
  const existingSlugs = new Set<string>();

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
        }
      }
    }
  };

  scanDir(path.join(pagesDir, 'learn'));
  scanDir(path.join(pagesDir, 'wine-pairings'));
  scanDir(path.join(pagesDir, 'buy'));

  return existingSlugs;
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

// Generate article content
function generateArticleContent(keyword: string, wines: any[], author: any): string {
  const title = keyword
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const description = `Discover the best ${keyword}. Expert recommendations, tasting notes, and tips from certified sommeliers.`;

  const today = new Date().toISOString().split('T')[0];

  const content = `---
import BaseLayout from '../../layouts/BaseLayout.astro';

const frontmatter = {
  title: "${title} - Expert Guide",
  description: "${description}",
  pubDate: "${today}",
  author: "${author.name}",
  authorRole: "${author.role}",
  keywords: ["${keyword}", "${keyword.split(' ').join('", "')}", "wine guide"]
};
---

<BaseLayout title={frontmatter.title} description={frontmatter.description}>
  <article class="container py-8 max-w-4xl mx-auto">
    <header class="mb-8">
      <h1 class="text-4xl font-bold text-wine-800 mb-4">${title}</h1>
      <p class="text-gray-600">By ${author.name}, ${author.role} | Updated ${today}</p>
    </header>

    <div class="prose prose-wine max-w-none">
      <p class="text-lg text-gray-700 mb-6">${generateIntro(keyword)}</p>

      <h2 class="text-2xl font-bold text-wine-700 mt-8 mb-4">Quick Answer</h2>
      <p class="text-gray-700">${generateQuickAnswer(keyword)}</p>

      <h2 class="text-2xl font-bold text-wine-700 mt-8 mb-4">Our Top Picks</h2>
      ${generateWineHTML(wines)}

      <h2 class="text-2xl font-bold text-wine-700 mt-8 mb-4">Expert Tips</h2>
      ${generateExpertTipsHTML(keyword)}

      <h2 class="text-2xl font-bold text-wine-700 mt-8 mb-4">Frequently Asked Questions</h2>
      ${generateFAQHTML(keyword)}

      <hr class="my-8 border-gray-300" />
      <p class="text-gray-600 italic">${author.name} is a ${author.role} with ${author.credentials.join(', ')}.</p>
    </div>
  </article>
</BaseLayout>
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
  if (wines.length === 0) {
    return '<p class="text-gray-700">Our team is currently curating the best selections for this category. Check back soon!</p>';
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

  // Get existing pages
  const existingPages = getExistingPages();
  console.log(`📄 Found ${existingPages.size} existing article slugs\n`);

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

  // Filter out keywords that already have articles
  const keywordsNeedingArticles = keywords.filter(kw => {
    const slug = keywordToSlug(kw.keyword);
    const hasArticle = existingPages.has(slug);
    if (hasArticle) {
      console.log(`  ⏭️  Skipping "${kw.keyword}" - article exists`);
    }
    return !hasArticle;
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

  for (const kw of toGenerate) {
    try {
      console.log(`\n🔄 Generating: "${kw.keyword}" (${kw.search_volume}/mo)`);

      const slug = keywordToSlug(kw.keyword);
      const category = determineCategory(kw.keyword);
      const filePath = path.join(process.cwd(), 'src/pages', category, `${slug}.astro`);

      // Get wine recommendations
      const wines = await getWinesForKeyword(kw.keyword, 3);
      console.log(`   Found ${wines.length} wine recommendations`);

      // Get author
      const author = getRandomAuthor();

      // Generate content
      const content = generateArticleContent(kw.keyword, wines, author);

      // Write file
      fs.writeFileSync(filePath, content);
      console.log(`   ✅ Created: ${category}/${slug}.astro`);

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
