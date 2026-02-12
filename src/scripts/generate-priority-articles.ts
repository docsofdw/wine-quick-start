/**
 * Generate Articles for Top Priority Keywords
 * Enhanced with:
 * - Intelligent image generation with SEO alt text
 * - Dynamic meta descriptions based on intent
 * - Multiple schema types (Article, FAQ, HowTo, Breadcrumb)
 * - Better content structure for featured snippets
 *
 * Usage:
 *   npx tsx src/scripts/generate-priority-articles.ts [options]
 *
 * Options:
 *   --limit=N       Generate N articles (default: 10)
 *   --dry-run       Preview without writing files
 *   --min-priority=N  Only keywords with priority >= N (default: 8)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config({ path: '.env.local', override: true });

// Import enhanced utilities
const { getWinesForKeyword } = await import('../lib/wine-catalog.js');
import { getRandomAuthor, getAuthorSchema } from '../data/authors.js';
import {
  generateArticleImage,
  generateAltText,
  generateCaption,
  generateImagePrompt,
} from '../lib/image-generation.js';
import {
  generateMetaDescription,
  generateSEOTitle,
  generateCanonicalUrl,
  generateCombinedSchema,
  determineIntent,
  type FAQItem,
  type HowToStep,
} from '../lib/seo-utils.js';

// Parse CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;
const priorityArg = args.find(a => a.startsWith('--min-priority='));
const minPriority = priorityArg ? parseInt(priorityArg.split('=')[1]) : 8;

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey);

// Replicate token for images
const replicateToken = process.env.REPLICATE_API_TOKEN;
if (replicateToken) {
  console.log('🎨 Image generation enabled (Replicate)\n');
} else {
  console.log('⚠️  REPLICATE_API_TOKEN not set - images will not be generated\n');
}

// ============================================================================
// Duplicate Detection
// ============================================================================

function normalizeToCoreTopic(text: string): string {
  return text
    .toLowerCase()
    .replace(/\.(astro|mdx)$/, '')
    .replace(/^(best-|top-|ultimate-|complete-|expert-)/g, '')
    .replace(/(-guide|-recommendations|-basics|-explained|-101|-tips)$/g, '')
    .replace(/^(wine-with-|best-wine-with-|what-wine-goes-with-|what-to-eat-with-)/, 'pairing-')
    .replace(/(-wine-pairing|-food-pairing|-pairing)$/, '')
    .replace(/^([a-z-]+)-food-pairing$/, 'pairing-$1')
    .replace(/^([a-z-]+)-wine-guide$/, '$1-wine')
    .replace(/^([a-z-]+)-wine$/, '$1')
    .replace(/(\b\w+\b)(?=.*\b\1\b)/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
}

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

function keywordToSlug(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isDuplicateTopic(keyword: string, existingTopics: Set<string>): boolean {
  const newTopic = normalizeToCoreTopic(keywordToSlug(keyword));
  return existingTopics.has(newTopic);
}

// ============================================================================
// Category Detection
// ============================================================================

function determineCategory(keyword: string): 'learn' | 'wine-pairings' | 'buy' {
  const lowerKw = keyword.toLowerCase();

  if (lowerKw.includes('pairing') || lowerKw.includes('with ') || lowerKw.includes('food')) {
    return 'wine-pairings';
  }
  if (lowerKw.includes('buy') || lowerKw.includes('price') || lowerKw.includes('for sale') ||
      lowerKw.includes('under $') || lowerKw.includes('under 20') || lowerKw.includes('under 50') ||
      lowerKw.includes('cheap') || lowerKw.includes('affordable') || lowerKw.includes('budget')) {
    return 'buy';
  }
  return 'learn';
}

// ============================================================================
// Content Generation
// ============================================================================

function generateIntro(keyword: string, intent: string): string {
  const intros: Record<string, string[]> = {
    commercial: [
      `Looking for the perfect ${keyword}? Our certified sommeliers have tasted dozens of options to bring you these expert-curated recommendations that deliver exceptional quality at every price point.`,
      `Choosing the right ${keyword} can transform your experience. We've done the research so you don't have to—here are our top picks backed by professional tasting notes and real-world testing.`,
    ],
    transactional: [
      `Ready to buy? Our sommelier team has curated the best ${keyword} options across every budget. From everyday values to special occasion splurges, these picks won't disappoint.`,
      `Finding great ${keyword} doesn't have to be complicated. We've selected wines that deliver outstanding quality, whether you're spending $15 or $150.`,
    ],
    informational: [
      `Understanding ${keyword} opens up a world of flavor possibilities. In this comprehensive guide, we'll explore everything from tasting profiles to food pairings—all from a sommelier's perspective.`,
      `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} represents one of wine's most fascinating topics. Let's dive deep into what makes it special and how to get the most from your experience.`,
    ],
  };

  const options = intros[intent] || intros.informational;
  return options[Math.floor(Math.random() * options.length)];
}

function generateQuickAnswer(keyword: string, intent: string): string {
  const kw = keyword.toLowerCase();

  // Food pairing quick answers
  if (kw.includes('with ') || kw.includes('pairing')) {
    const food = kw.replace(/^.*?with\s+/i, '').replace(/\s+pairing.*$/i, '').replace(/wine\s*/i, '').trim();
    return `For ${food}, choose wines that complement the dish's weight and flavors. Medium-bodied options with good acidity typically work best, creating harmony between food and wine. Consider the cooking method and sauces when making your final selection.`;
  }

  // Budget quick answers
  if (/under\s+\$?\d+|cheap|affordable|budget/.test(kw)) {
    return `Excellent wines exist at every price point. Focus on lesser-known regions and grape varieties for the best value—these often deliver $30+ quality at fraction of the cost. Portugal, Argentina, and southern France consistently overdeliver.`;
  }

  // Comparison quick answers
  if (/\bvs\b|versus/.test(kw)) {
    return `Both wines have distinct characteristics that make them ideal for different occasions. Consider your food pairing, personal taste preferences, and the specific occasion when choosing between them.`;
  }

  // Varietal/region quick answers
  return `Start with well-regarded producers from established regions to understand the classic style. Then explore different expressions based on your taste preferences. Quality indicators matter more than price point.`;
}

function generateDefaultFAQs(keyword: string): { question: string; answer: string }[] {
  const kw = keyword.toLowerCase();

  // Generate topic-specific FAQs
  const faqs: { question: string; answer: string }[] = [];

  // Common pattern: "What should I look for..."
  faqs.push({
    question: `What should I look for when choosing ${keyword}?`,
    answer: `Focus on balance between fruit, acidity, and structure. Look for reputable producers, check vintage quality, and consider your specific use case—whether for immediate drinking, aging, or food pairing.`,
  });

  // Price question
  faqs.push({
    question: `How much should I spend on ${keyword}?`,
    answer: `Quality ${keyword} exists at every price point. For everyday drinking, $15-25 offers excellent value. For special occasions, $40-75 typically provides a noticeable quality jump. Above $100, you're often paying for prestige.`,
  });

  // Storage question
  faqs.push({
    question: `How do I store ${keyword} properly?`,
    answer: `Store bottles on their side in a cool (55°F/13°C), dark place with consistent temperature. Avoid vibration and temperature fluctuations. Most wines are best consumed within 2-5 years of purchase.`,
  });

  // Serving question
  faqs.push({
    question: `What's the best way to serve ${keyword}?`,
    answer: `Serve whites chilled (45-50°F) and reds slightly below room temperature (60-65°F). Consider decanting fuller-bodied wines for 30-60 minutes to allow flavors to open up.`,
  });

  // Beginner question
  if (!kw.includes('beginner')) {
    faqs.push({
      question: `Is ${keyword} good for wine beginners?`,
      answer: `Absolutely. Start with approachable, fruit-forward examples and work your way toward more complex styles. Don't be afraid to ask for recommendations at your local wine shop.`,
    });
  }

  return faqs;
}

function generateWineHTML(wines: any[]): string {
  if (wines.length === 0) return '';

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
  const kw = keyword.toLowerCase();

  // Generate topic-specific tips
  let tips: string[] = [];

  if (kw.includes('pairing') || kw.includes('with ')) {
    tips = [
      `<strong>Match intensity</strong> - Pair bold wines with rich dishes, lighter wines with delicate foods. The wine and food should complement, not overpower each other.`,
      `<strong>Consider acidity</strong> - High-acid wines cut through fatty and creamy dishes beautifully, cleansing the palate between bites.`,
      `<strong>Bridge flavors</strong> - Look for flavor connections between wine and food—herbal wines with herb-crusted dishes, for example.`,
      `<strong>Regional pairing</strong> - Wines and foods from the same region often pair naturally after centuries of co-evolution.`,
      `<strong>Don't overthink it</strong> - If you enjoy the combination, it works. Trust your palate over rigid rules.`,
    ];
  } else if (/under\s+\$?\d+|cheap|budget/.test(kw)) {
    tips = [
      `<strong>Explore lesser-known regions</strong> - Portugal, Chile, and southern France consistently deliver outstanding value.`,
      `<strong>Look for younger vintages</strong> - Fresh, current releases often offer better value than aged wines at this price point.`,
      `<strong>Try indigenous varieties</strong> - Local grape varieties from their home regions often overdeliver on quality-to-price ratio.`,
      `<strong>Buy by the case</strong> - Many retailers offer 10-20% discounts on case purchases, stretching your budget further.`,
      `<strong>Check scores carefully</strong> - A 90-point wine at $15 is a better value than a 92-point wine at $40.`,
    ];
  } else {
    tips = [
      `<strong>Temperature matters</strong> - Serve whites at 45-50°F and reds at 60-65°F for optimal flavor expression.`,
      `<strong>Decanting helps</strong> - Give bold reds 30-60 minutes in a decanter to open up and soften tannins.`,
      `<strong>Trust your palate</strong> - Wine scores are guides, not rules. The best wine is the one you enjoy most.`,
      `<strong>Store properly</strong> - Keep bottles on their side in a cool, dark place with stable temperature.`,
      `<strong>Ask questions</strong> - Wine professionals love sharing knowledge. Don't hesitate to ask for recommendations.`,
      `<strong>Take notes</strong> - Keep track of what you enjoy to refine your preferences over time.`,
    ];
  }

  return `
      <ol class="list-decimal list-inside space-y-4 text-gray-700">
        ${tips.map(tip => `<li>${tip}</li>`).join('\n        ')}
      </ol>`;
}

function generateFAQHTML(faqs: { question: string; answer: string }[]): string {
  return `
      <div class="space-y-6">
        ${faqs.map(faq => `
        <div>
          <h3 class="text-lg font-semibold text-wine-700 mb-2">${faq.question}</h3>
          <p class="text-gray-700">${faq.answer}</p>
        </div>`).join('')}
      </div>`;
}

// ============================================================================
// Article Generation
// ============================================================================

function generateArticleContent(
  keyword: string,
  wines: any[],
  author: any,
  slug: string,
  category: 'learn' | 'wine-pairings' | 'buy',
  imageData: { success: boolean; altText: string; caption: string }
): string {
  const intent = determineIntent(keyword);
  const title = generateSEOTitle(keyword, category);
  const description = generateMetaDescription(keyword, intent);
  const canonicalUrl = generateCanonicalUrl(category, slug);
  const today = new Date().toISOString().split('T')[0];

  // Generate FAQs for schema
  const faqs = generateDefaultFAQs(keyword);

  // Build structured data with multiple schemas
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      // Article schema
      {
        "@type": "Article",
        "headline": title,
        "description": description,
        "image": imageData.success ? `https://winesquickstart.com/images/articles/${slug}.png` : undefined,
        "author": {
          "@type": "Person",
          "name": author.name,
          "jobTitle": author.role,
          "url": `https://winesquickstart.com/about/${author.slug}`,
        },
        "publisher": {
          "@type": "Organization",
          "name": "Wine Quick Start",
          "logo": {
            "@type": "ImageObject",
            "url": "https://winesquickstart.com/logo.png",
          }
        },
        "datePublished": new Date().toISOString(),
        "dateModified": new Date().toISOString(),
        "mainEntityOfPage": canonicalUrl,
      },
      // Breadcrumb schema
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://winesquickstart.com" },
          { "@type": "ListItem", "position": 2, "name": category === 'learn' ? 'Wine Guides' : category === 'wine-pairings' ? 'Wine Pairings' : 'Buying Guides', "item": `https://winesquickstart.com/${category}` },
          { "@type": "ListItem", "position": 3, "name": title, "item": canonicalUrl },
        ]
      },
      // FAQ schema
      {
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": { "@type": "Answer", "text": faq.answer }
        }))
      }
    ]
  };

  // Build imports
  const imports = [`import ArticleLayout from '../../layouts/ArticleLayout.astro';`];
  if (imageData.success) {
    imports.push(`import featuredImage from '../../assets/images/articles/${slug}.png';`);
  }

  // Build layout props
  const layoutProps = [
    `title={frontmatter.title}`,
    `description={frontmatter.description}`,
    `author={frontmatter.author}`,
    `readTime={frontmatter.readTime}`,
    `category="${category === 'learn' ? 'Wine Guide' : category === 'wine-pairings' ? 'Wine Pairing' : 'Buying Guide'}"`,
    `schema={frontmatter.structured_data}`,
  ];
  if (imageData.success) {
    layoutProps.push(`featuredImage={featuredImage}`);
    layoutProps.push(`featuredImageAlt={frontmatter.featuredImageAlt}`);
  }

  const keywordParts = keyword.split(' ').filter(w => w.length > 2);

  const content = `---
${imports.join('\n')}

const frontmatter = {
  title: "${title}",
  description: "${description}",
  pubDate: "${today}",
  author: "${author.name}",
  authorRole: "${author.role}",
  authorSlug: "${author.slug}",
  readTime: "6 min",
  keywords: ["${keyword}", ${keywordParts.map(w => `"${w}"`).join(', ')}, "wine guide", "sommelier picks"],
  canonicalUrl: "${canonicalUrl}",
  ${imageData.success ? `featuredImageAlt: "${imageData.altText}",` : ''}
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
    <p><strong>Quick Answer:</strong> ${generateQuickAnswer(keyword, intent)}</p>
  </div>

  <h2>Understanding ${keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</h2>
  <p>${generateIntro(keyword, intent)}</p>

  <h2>Our Top Picks</h2>
  ${generateWineHTML(wines)}

  <h2>Expert Tips</h2>
  ${generateExpertTipsHTML(keyword)}

  <h2>Frequently Asked Questions</h2>
  ${generateFAQHTML(faqs)}

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

// ============================================================================
// Main Generation Function
// ============================================================================

async function generateArticles() {
  console.log('🍷 Enhanced Article Generator\n');
  console.log('═══════════════════════════════════════════════\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Limit: ${limit} articles`);
  console.log(`Min Priority: ${minPriority}\n`);

  // Get existing pages
  const { slugs: existingSlugs, topics: existingTopics } = getExistingPages();
  console.log(`📄 Found ${existingSlugs.size} existing articles`);
  console.log(`🔍 Tracking ${existingTopics.size} unique topics\n`);

  // Get high-priority keywords
  const { data: keywords, error } = await client
    .from('keyword_opportunities')
    .select('*')
    .eq('status', 'active')
    .gte('priority', minPriority)
    .order('priority', { ascending: false })
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

  console.log(`🎯 Found ${keywords.length} keywords with priority >= ${minPriority}\n`);

  // Filter duplicates
  const keywordsNeedingArticles = keywords.filter(kw => {
    const slug = keywordToSlug(kw.keyword);

    if (existingSlugs.has(slug)) {
      console.log(`  ⏭️  Skip "${kw.keyword}" - article exists`);
      return false;
    }

    if (isDuplicateTopic(kw.keyword, existingTopics)) {
      console.log(`  ⏭️  Skip "${kw.keyword}" - similar topic exists`);
      return false;
    }

    return true;
  });

  console.log(`\n📝 ${keywordsNeedingArticles.length} keywords need articles\n`);

  if (keywordsNeedingArticles.length === 0) {
    console.log('✅ All high-priority keywords have articles!');
    return;
  }

  // Generate articles
  const toGenerate = keywordsNeedingArticles.slice(0, limit);
  let generated = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < toGenerate.length; i++) {
    const kw = toGenerate[i];

    console.log(`\n🔄 [${i + 1}/${toGenerate.length}] "${kw.keyword}"`);
    console.log(`   Priority: ${kw.priority} | Volume: ${kw.search_volume}/mo`);

    try {
      const slug = keywordToSlug(kw.keyword);
      const category = determineCategory(kw.keyword);
      const filePath = path.join(process.cwd(), 'src/pages', category, `${slug}.astro`);

      // Check for matching wines
      const wines = await getWinesForKeyword(kw.keyword, 3);

      if (wines.length === 0) {
        console.log(`   ⏭️  Skipping - no matching wines in catalog`);
        skipped++;
        continue;
      }

      console.log(`   🍷 Found ${wines.length} wine recommendations`);

      if (isDryRun) {
        console.log(`   📋 Would create: ${category}/${slug}.astro`);
        generated++;
        continue;
      }

      // Generate image
      let imageData = { success: false, altText: '', caption: '' };
      if (replicateToken) {
        imageData = await generateArticleImage(slug, kw.keyword, replicateToken);

        // Rate limit between image generations
        if (imageData.success && i < toGenerate.length - 1) {
          console.log(`   ⏳ Rate limit pause (10s)...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }

      // Get author
      const author = getRandomAuthor();

      // Generate content
      const content = generateArticleContent(
        kw.keyword,
        wines,
        author,
        slug,
        category,
        imageData
      );

      // Write file
      fs.writeFileSync(filePath, content);
      console.log(`   ✅ Created: ${category}/${slug}.astro`);

      // Track topic to prevent duplicates in same run
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

  // Summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('📋 GENERATION SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ Generated: ${generated}`);
  console.log(`⏭️  Skipped (no wines): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${toGenerate.length}`);

  if (generated > 0 && !isDryRun) {
    console.log('\n📄 Articles Created:');
    toGenerate.slice(0, generated + skipped).forEach((kw, i) => {
      if (i < generated) {
        const category = determineCategory(kw.keyword);
        const slug = keywordToSlug(kw.keyword);
        console.log(`   ✅ ${category}/${slug}.astro`);
      }
    });
  }
}

// Run
generateArticles()
  .then(() => {
    console.log('\n✅ Article generation complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
