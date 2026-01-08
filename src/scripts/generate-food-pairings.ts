/**
 * Generate Food Pairing Articles
 * High-intent searches: "wine with [food]"
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

const foodPairings = [
  { keyword: 'wine with steak', volume: 12100, wineType: 'red', food: 'steak', pairings: ['Cabernet Sauvignon', 'Malbec', 'Syrah'] },
  { keyword: 'wine with chicken', volume: 8100, wineType: 'white', food: 'chicken', pairings: ['Chardonnay', 'Pinot Grigio', 'Sauvignon Blanc'] },
  { keyword: 'wine with pasta', volume: 6600, wineType: 'red', food: 'pasta', pairings: ['Chianti', 'Barbera', 'Sangiovese'] },
  { keyword: 'wine with pizza', volume: 5400, wineType: 'red', food: 'pizza', pairings: ['Chianti', 'Montepulciano', 'Lambrusco'] },
  { keyword: 'wine with fish', volume: 4400, wineType: 'white', food: 'fish', pairings: ['Sauvignon Blanc', 'Chablis', 'Vermentino'] },
  { keyword: 'wine with turkey', volume: 4400, wineType: 'red', food: 'turkey', pairings: ['Pinot Noir', 'Beaujolais', 'Zinfandel'] },
  { keyword: 'wine with lamb', volume: 3600, wineType: 'red', food: 'lamb', pairings: ['Bordeaux', 'Rioja', 'Côtes du Rhône'] },
  { keyword: 'wine with pork', volume: 2900, wineType: 'white', food: 'pork', pairings: ['Riesling', 'Pinot Gris', 'Chenin Blanc'] },
  { keyword: 'wine with cheese', volume: 14800, wineType: 'red', food: 'cheese', pairings: ['Cabernet Sauvignon', 'Port', 'Sauternes'] },
  { keyword: 'wine with seafood', volume: 2400, wineType: 'white', food: 'seafood', pairings: ['Muscadet', 'Albariño', 'Verdicchio'] },
  { keyword: 'wine with sushi', volume: 2900, wineType: 'white', food: 'sushi', pairings: ['Champagne', 'Grüner Veltliner', 'Dry Riesling'] },
  { keyword: 'wine with tacos', volume: 1900, wineType: 'red', food: 'tacos', pairings: ['Malbec', 'Garnacha', 'Tempranillo'] },
];

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

async function generateArticle(pairing: typeof foodPairings[0]) {
  const { keyword, volume, wineType, food, pairings } = pairing;
  const slug = keyword.replace(/\s+/g, '-').toLowerCase();
  const filepath = path.join(process.cwd(), 'src/pages/wine-pairings', `${slug}.astro`);

  // Check if file already exists
  try {
    await fs.access(filepath);
    console.log(`⏭️  Skipping "${keyword}" - already exists`);
    return;
  } catch {}

  console.log(`📄 Generating article for "${keyword}"...`);

  // Get real wines for the recommended varieties
  const wines = await getWinesForKeyword(pairings[0], wineType as any);
  const author = getRandomAuthor();
  const content = generateVariedContent(keyword, 'pairing', wines);
  const title = `Best ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: Expert Pairing Guide`;
  const description = `Discover the perfect ${keyword}. Our sommeliers recommend ${pairings.slice(0, 2).join(' and ')} for the best experience.`;

  // Get related articles
  const relatedArticles = findRelatedArticles(keyword, 'wine-pairings');

  // Auto-link content
  const linkedIntro = autoLinkContent(content.intro, keyword);

  // Build wines JSON
  const winesJson = JSON.stringify(wines.slice(0, 3), null, 2);
  const authorSchemaJson = JSON.stringify(getAuthorSchema(author), null, 8);
  const credsJson = JSON.stringify(author.credentials);
  const initials = author.name.split(' ').map(n => n[0]).join('');
  const capFood = food.charAt(0).toUpperCase() + food.slice(1);

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
  <h2>Our Top Wine Picks for ${capFood}</h2>

  <p>These wines have been selected by our sommelier team specifically for pairing with ${food}:</p>
${wineItems}
`;
  }

  // Related articles section
  const relatedSection = relatedArticles.slice(0, 4).map(article => `
      <a href="${article.url}" class="block p-4 bg-gray-50 rounded-lg hover:bg-wine-50 transition group">
        <span class="text-xs text-wine-600 uppercase tracking-wide">${article.section}</span>
        <h4 class="font-semibold text-gray-900 group-hover:text-wine-600 mt-1">${article.title}</h4>
      </a>`).join('');

  // Build the Astro file
  const astroContent = `---
import ArticleLayout from '../../layouts/ArticleLayout.astro';

const frontmatter = {
  title: "${title}",
  description: "${description}",
  wine_type: "${wineType}",
  food: "${food}",
  author: "${author.name}",
  authorSlug: "${author.slug}",
  authorRole: "${author.role}",
  authorCredentials: ${credsJson},
  readTime: "${content.readTime}",
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
    "keywords": "${keyword}, ${food} wine pairing, best wine for ${food}",
    "articleSection": "Wine Pairing"
  },
  wines: ${winesJson}
};
---

<ArticleLayout title={frontmatter.title} description={frontmatter.description} author={frontmatter.author} readTime={frontmatter.readTime} category="Food Pairing" schema={frontmatter.structured_data}>
  <div slot="quick-answer">
    <p><strong>Quick Answer:</strong> The best wines for ${food} are **${pairings[0]}**, **${pairings[1]}**, and **${pairings[2]}**. ${pairings[0]} is our top pick for its ${wineType === 'red' ? 'bold tannins and rich fruit' : 'crisp acidity and fresh flavors'} that complement ${food} perfectly.</p>
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

  <h2>Why ${pairings[0]} Works Best with ${capFood}</h2>

  <p>${pairings[0]} is our sommelier team's top recommendation for ${food}. ${wineType === 'red' ? `The wine's structured tannins cut through the richness of ${food}, while its dark fruit flavors create a harmonious balance on the palate.` : `The wine's bright acidity cleanses the palate between bites, while its citrus and mineral notes enhance ${food}'s natural flavors.`}</p>

  <h2>Top 3 Wine Styles for ${capFood}</h2>

  <h3>1. ${pairings[0]} (Top Pick)</h3>

  <p>${wineType === 'red' ? `Bold and full-bodied, ${pairings[0]} brings intensity that stands up to ${food}'s robust flavors.` : `Crisp and refreshing, ${pairings[0]} offers the perfect counterpoint to ${food}'s delicate textures.`}</p>

  <ul>
    <li>**Flavor Profile**: ${wineType === 'red' ? 'Dark fruits, spice, structured tannins' : 'Citrus, stone fruit, mineral finish'}</li>
    <li>**Why It Works**: ${wineType === 'red' ? 'Tannins cut through fat and protein' : 'Acidity brightens and cleanses'}</li>
    <li>**Price Range**: $15-40</li>
  </ul>

  <h3>2. ${pairings[1]} (Versatile Choice)</h3>

  <p>${pairings[1]} offers a more ${wineType === 'red' ? 'approachable, fruit-forward' : 'elegant, nuanced'} option that pairs beautifully with a variety of ${food} preparations.</p>

  <ul>
    <li>**Flavor Profile**: ${wineType === 'red' ? 'Red fruits, soft tannins, smooth finish' : 'Floral notes, balanced acidity, clean finish'}</li>
    <li>**Why It Works**: Versatile enough for simple or complex dishes</li>
    <li>**Price Range**: $12-30</li>
  </ul>

  <h3>3. ${pairings[2]} (Budget-Friendly)</h3>

  <p>Don't overlook ${pairings[2]} as an excellent value option for everyday ${food} dishes.</p>

  <ul>
    <li>**Flavor Profile**: ${wineType === 'red' ? 'Earthy, medium-bodied, food-friendly' : 'Light, crisp, refreshing'}</li>
    <li>**Why It Works**: Great quality-to-price ratio</li>
    <li>**Price Range**: $10-20</li>
  </ul>
${wineRecsSection}
  <h2>Pairing Tips from Our Sommeliers</h2>

  <h3>Consider the Preparation</h3>

  <p>How your ${food} is prepared matters as much as the ${food} itself:</p>

  <ul>
    <li>**Grilled or Roasted**: Go bolder with ${wineType === 'red' ? 'full-bodied reds' : 'oaked whites'}</li>
    <li>**Light or Poached**: Choose ${wineType === 'red' ? 'lighter reds like Pinot Noir' : 'unoaked, crisp whites'}</li>
    <li>**With Rich Sauce**: Match the sauce's intensity with your wine choice</li>
  </ul>

  <h3>Temperature Matters</h3>

  <p>${wineType === 'red' ? 'Serve red wines slightly below room temperature (60-65°F) to let the flavors shine without the alcohol dominating.' : 'Chill white wines to 45-50°F for optimal refreshment, but not so cold that the flavors are muted.'}</p>

  <h2>Wines to Avoid with ${capFood}</h2>

  <p>Not every wine works with ${food}. Here's what to skip:</p>

  <ul>
    <li>${wineType === 'red' ? '**Very tannic young wines**: Can overpower delicate flavors' : '**Heavy oaked wines**: Can clash with lighter preparations'}</li>
    <li>**Very sweet wines**: Unless you're pairing with a sweet glaze or sauce</li>
    <li>${wineType === 'red' ? '**Light-bodied whites**: Generally lack the weight to match' : '**Full-bodied reds**: Usually too heavy for the dish'}</li>
  </ul>

  <!-- Related Articles -->
  <div class="mt-10 pt-8 border-t border-gray-200">
    <h3 class="text-xl font-semibold mb-6">More Pairing Guides</h3>
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
  console.log(`✅ Created: ${slug}.astro (Volume: ${volume}/mo)`);
  if (wines.length > 0) {
    console.log(`   🍷 Added ${wines.length} wine recommendations`);
  }

  // Register for internal linking
  registerArticle({
    slug,
    title,
    url: `/wine-pairings/${slug}/`,
    section: 'wine-pairings',
    topics: [keyword, `${food} pairing`],
    keywords: [keyword, food, ...pairings],
    wineType,
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
        content_type: 'food-pairing',
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
  console.log('🍷 Generating food pairing articles...\n');

  for (const pairing of foodPairings) {
    await generateArticle(pairing);
  }

  console.log('\n✅ Done! Run `npm run build` to compile the new articles.');
}

main();
