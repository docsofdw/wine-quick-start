/**
 * Generate Wine Variety Articles
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const { getWinesForKeyword } = await import('../lib/wine-catalog.js');
import { generateVariedContent, generateTitle, generateDescription } from '../lib/article-templates.js';
import { getRandomAuthor, getAuthorSchema } from '../data/authors.js';
import { findRelatedArticles, autoLinkContent, registerArticle } from '../lib/internal-linking.js';
import { detectRegions, generateRegionBlock } from '../data/wine-regions.js';

const varieties = [
  { keyword: 'merlot', volume: 74000, type: 'red' },
  { keyword: 'sauvignon blanc', volume: 60500, type: 'white' },
  { keyword: 'riesling', volume: 49500, type: 'white' },
  { keyword: 'malbec', volume: 40500, type: 'red' },
  { keyword: 'zinfandel', volume: 33100, type: 'red' },
  { keyword: 'prosecco', volume: 90500, type: 'sparkling' },
  { keyword: 'rose wine', volume: 22200, type: 'rose' },
  { keyword: 'syrah', volume: 18100, type: 'red' },
];

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

async function generateArticle(variety: typeof varieties[0]) {
  const { keyword, volume, type } = variety;
  const slug = keyword.replace(/\s+/g, '-').toLowerCase();
  const filepath = path.join(process.cwd(), 'src/pages/wine-pairings', `${slug}.astro`);

  // Check if file already exists
  try {
    await fs.access(filepath);
    console.log(`⏭️  Skipping ${keyword} - already exists`);
    return;
  } catch {}

  console.log(`📄 Generating article for "${keyword}"...`);

  // Get real wines
  const wines = await getWinesForKeyword(keyword, type as any);
  const author = getRandomAuthor();
  const content = generateVariedContent(keyword, 'varietal', wines);
  const title = generateTitle(keyword, content.format);
  const description = generateDescription(keyword, content.format);

  // Get related articles and region
  const relatedArticles = findRelatedArticles(keyword, 'wine-pairings');
  const regions = detectRegions(keyword);
  const regionBlock = regions.length > 0 ? generateRegionBlock(regions[0]) : '';

  // Auto-link content
  const linkedIntro = autoLinkContent(content.intro, keyword);

  // Build wines JSON
  const winesJson = JSON.stringify(wines.slice(0, 3), null, 2);
  const authorSchemaJson = JSON.stringify(getAuthorSchema(author), null, 8);
  const credsJson = JSON.stringify(author.credentials);
  const initials = author.name.split(' ').map(n => n[0]).join('');
  const capKeyword = keyword.charAt(0).toUpperCase() + keyword.slice(1);

  // Wine recommendations section
  let wineRecsSection = '';
  if (wines.length > 0) {
    const wineItems = wines.slice(0, 3).map((wine, i) => `
  <h3>${i + 1}. ${wine.name}</h3>

  <p>**Region:** ${wine.region}</p>

  <p>**Price:** $${wine.price} | **Rating:** ${wine.rating}/100</p>

  <p>${wine.notes}</p>

  <p>[Find this wine →](${wine.link})</p>`).join('\n');

    wineRecsSection = `
  <h2>Expert Recommendations</h2>

  <p>Our curated selections represent exceptional quality and value:</p>
${wineItems}
`;
  }

  // Related articles section
  const relatedSection = relatedArticles.slice(0, 4).map(article => `
      <a href="${article.url}" class="block p-4 bg-gray-50 rounded-lg hover:bg-wine-50 transition group">
        <span class="text-xs text-wine-600 uppercase tracking-wide">${article.section}</span>
        <h4 class="font-semibold text-gray-900 group-hover:text-wine-600 mt-1">${article.title}</h4>
      </a>`).join('');

  // Region block section
  const regionSection = regionBlock ? `
  <!-- Regional Deep Dive -->
  <div class="mt-8 p-6 bg-wine-50 rounded-lg border border-wine-200">
    ${regionBlock}
  </div>
` : '';

  // Food pairings based on type
  let pairing1 = 'Grilled meats';
  let pairing2 = 'Aged cheeses';
  let pairing3 = 'Rich stews';
  if (type === 'white') {
    pairing1 = 'Seafood';
    pairing2 = 'Creamy sauces';
    pairing3 = 'Roasted vegetables';
  } else if (type === 'sparkling' || type === 'rose') {
    pairing1 = 'Appetizers';
    pairing2 = 'Light salads';
    pairing3 = 'Fresh fruits';
  }

  // Build the Astro file
  const astroContent = `---
import ArticleLayout from '../../layouts/ArticleLayout.astro';

const frontmatter = {
  title: "${title}",
  description: "${description}",
  wine_type: "${type}",
  author: "${author.name}",
  authorSlug: "${author.slug}",
  authorRole: "${author.role}",
  authorCredentials: ${credsJson},
  readTime: "${content.readTime}",
  expert_score: ${content.expertScore},
  article_format: "${content.format}",
  structured_data: {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${title}",
    "description": "${description}",
    "author": ${authorSchemaJson},
    "publisher": {
      "@type": "Organization",
      "name": "Wine Quick Start",
      "url": "https://winequickstart.com"
    },
    "datePublished": "${new Date().toISOString()}",
    "dateModified": "${new Date().toISOString()}",
    "keywords": "${keyword}",
    "articleSection": "Wine Guide"
  },
  wines: ${winesJson}
};
---

<ArticleLayout title={frontmatter.title} description={frontmatter.description} author={frontmatter.author} readTime={frontmatter.readTime} category="Wine Guide" schema={frontmatter.structured_data}>
  <div slot="quick-answer">
    <p><strong>${content.quickAnswer.title}:</strong> ${content.quickAnswer.content}</p>
  </div>

  <!-- Author Attribution -->
  <div class="bg-gray-50 p-4 rounded-lg mb-6 flex items-center gap-4">
    <div class="w-12 h-12 rounded-full bg-wine-100 flex items-center justify-center text-wine-700 font-bold">
      ${initials}
    </div>
    <div>
      <a href="/about/${author.slug}" class="font-semibold text-gray-900 hover:text-wine-600">${author.name}</a>
      <p class="text-sm text-gray-600">${author.role} | ${author.credentials[0]}</p>
    </div>
  </div>

  ${linkedIntro}

  <h2>Understanding ${capKeyword}</h2>

  <p>${content.mainContent}</p>

  <h2>Key Characteristics</h2>

  <h3>What to Look For</h3>

  <ul>
    <li>**Balance**: The interplay between fruit, acid, and structure</li>
    <li>**Expression**: How clearly the wine shows its origins</li>
    <li>**Finish**: The lasting impression after each sip</li>
    <li>**Complexity**: Layers of flavor that reveal themselves over time</li>
  </ul>
${wineRecsSection}
  <h2>Food Pairing Guide</h2>

  <p>The best food pairings for ${keyword} depend on the wine's body and flavor profile.</p>

  <h3>Classic Pairings</h3>

  <ul>
    <li>**${pairing1}**: A natural match</li>
    <li>**${pairing2}**: Complementary flavors</li>
    <li>**${pairing3}**: Perfect balance</li>
  </ul>
${regionSection}
  <!-- Related Articles -->
  <div class="mt-10 pt-8 border-t border-gray-200">
    <h3 class="text-xl font-semibold mb-6">Continue Reading</h3>
    <div class="grid md:grid-cols-2 gap-4">${relatedSection}
    </div>
  </div>

  <!-- Author Bio Footer -->
  <div class="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
    <h3 class="text-lg font-semibold mb-3">About the Author</h3>
    <div class="flex items-start gap-4">
      <div class="w-16 h-16 rounded-full bg-wine-100 flex items-center justify-center text-wine-700 font-bold text-xl flex-shrink-0">
        ${initials}
      </div>
      <div>
        <a href="/about/${author.slug}" class="font-semibold text-wine-600 hover:text-wine-800">${author.name}</a>
        <p class="text-sm text-gray-600 mb-2">${author.role}</p>
        <p class="text-sm text-gray-700">${author.shortBio}</p>
        <a href="/about/${author.slug}" class="text-sm text-wine-600 hover:text-wine-800 mt-2 inline-block">View full profile &rarr;</a>
      </div>
    </div>
  </div>

</ArticleLayout>
`;

  await fs.writeFile(filepath, astroContent);
  console.log(`✅ Created: ${slug}.astro (Volume: ${volume})`);
  if (wines.length > 0) {
    console.log(`   🍷 Using ${wines.length} real wines from catalog`);
  }

  // Register for internal linking
  registerArticle({
    slug,
    title,
    url: `/wine-pairings/${slug}/`,
    section: 'wine-pairings',
    topics: [keyword],
    keywords: [keyword, type],
    wineType: type,
    region: regions[0] || undefined
  });

  // Save to database if available
  if (supabase) {
    try {
      await supabase.from('wine_pages').insert({
        slug,
        keyword,
        title,
        description,
        volume,
        status: 'published',
        content_type: 'variety',
        created_at: new Date().toISOString()
      });
    } catch (e: any) {
      if (!e.message?.includes('duplicate')) {
        console.log(`   ⚠️  DB: ${e.message}`);
      }
    }
  }
}

async function main() {
  console.log('🍷 Generating wine variety articles...\n');

  for (const variety of varieties) {
    await generateArticle(variety);
  }

  console.log('\n✅ Done! Run `npm run build` to compile the new articles.');
}

main();
