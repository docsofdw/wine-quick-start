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

  // Generate wine recommendations section
  const wineRecommendations = wines.length > 0 ? wines.map((wine, i) => `
### ${i + 1}. ${wine.name}

**Producer:** ${wine.producer}
**Region:** ${wine.region}
**Variety:** ${wine.variety || 'Blend'}

${wine.notes}
`).join('\n') : '';

  const content = `---
title: "${title} - Expert Guide"
description: "${description}"
pubDate: "${today}"
author: "${author.name}"
authorRole: "${author.role}"
keywords: ["${keyword}", "${keyword.split(' ').join('", "')}", "wine guide"]
---

import BaseLayout from '../../layouts/BaseLayout.astro';

<BaseLayout title="${title}" description="${description}">

# ${title}

*By ${author.name}, ${author.role} | Updated ${today}*

${generateIntro(keyword)}

## Quick Answer

${generateQuickAnswer(keyword)}

## Our Top Picks

${wineRecommendations || 'Our team is currently curating the best selections for this category. Check back soon!'}

## Expert Tips

${generateExpertTips(keyword)}

## Frequently Asked Questions

${generateFAQ(keyword)}

---

*${author.name} is a ${author.role} with ${author.credentials.join(', ')}.*

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
