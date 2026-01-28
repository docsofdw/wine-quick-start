/**
 * SEO Utilities for Wine Articles
 * Schema generation, meta descriptions, and structured data
 */

export interface ArticleMeta {
  title: string;
  keyword: string;
  description: string;
  author: {
    name: string;
    role: string;
    slug: string;
  };
  pubDate: string;
  modDate?: string;
  category: 'learn' | 'wine-pairings' | 'buy';
  intent: 'informational' | 'commercial' | 'transactional';
  imageAlt?: string;
  imageCaption?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface HowToStep {
  name: string;
  text: string;
  image?: string;
}

/**
 * Determine search intent from keyword
 */
export function determineIntent(keyword: string): 'informational' | 'commercial' | 'transactional' {
  const kw = keyword.toLowerCase();

  if (/buy|shop|order|price|deal|under \$|cheap|affordable/.test(kw)) {
    return 'transactional';
  }

  if (/best|top|review|vs|compare|rating|recommend/.test(kw)) {
    return 'commercial';
  }

  return 'informational';
}

/**
 * Generate dynamic meta description based on intent and keyword
 * Optimized for CTR with 150-160 character target
 */
export function generateMetaDescription(keyword: string, intent: string): string {
  const kw = keyword.toLowerCase();
  const date = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  // Food pairing articles
  if (kw.includes('with ') || kw.includes('pairing')) {
    const food = kw.replace(/^.*?with\s+/i, '').replace(/\s+pairing.*$/i, '').trim();
    return `Find the perfect wine for ${food}. Expert sommelier picks with flavor matching tips and serving suggestions. Updated ${date}.`;
  }

  // Budget/price articles
  if (/under\s+\$?\d+|cheap|affordable|budget/.test(kw)) {
    const priceMatch = kw.match(/under\s+\$?(\d+)/);
    const price = priceMatch ? `$${priceMatch[1]}` : 'any budget';
    return `Best wines ${price.includes('$') ? 'under ' + price : 'for ' + price}. Quality picks that won't break the bank. Sommelier-approved values. Updated ${date}.`;
  }

  // Comparison articles
  if (/\bvs\b|versus|difference between/.test(kw)) {
    const wines = kw.split(/\s+vs\s+|\s+versus\s+/i);
    return `${wines[0]} vs ${wines[1] || 'comparison'}: Key differences in taste, price & food pairings. Expert breakdown to help you choose.`;
  }

  // Regional articles
  if (/bordeaux|burgundy|champagne|napa|tuscany|rioja|barolo/.test(kw)) {
    const region = kw.match(/(bordeaux|burgundy|champagne|napa|tuscany|rioja|barolo)/i)?.[0] || '';
    return `Complete guide to ${region.charAt(0).toUpperCase() + region.slice(1)} wines. Best producers, vintages to buy & food pairings. Expert recommendations.`;
  }

  // Varietal articles
  if (/cabernet|merlot|chardonnay|pinot|riesling|malbec|syrah/.test(kw)) {
    const varietal = kw.match(/(cabernet|merlot|chardonnay|pinot noir|pinot grigio|riesling|malbec|syrah)/i)?.[0] || '';
    return `Everything about ${varietal.charAt(0).toUpperCase() + varietal.slice(1)}: tasting notes, top producers, food pairings & buying tips. Sommelier guide.`;
  }

  // Commercial intent (best, top, review)
  if (intent === 'commercial') {
    return `Compare the best ${keyword} picks. Expert ratings, prices & where to buy. Sommelier recommendations updated ${date}.`;
  }

  // Transactional intent
  if (intent === 'transactional') {
    return `Shop the best ${keyword}. Curated picks from $15-$100+. Free shipping options & expert tasting notes included.`;
  }

  // Default informational
  return `Learn about ${keyword}: expert tasting notes, food pairings & buying tips from certified sommeliers. Complete guide.`;
}

/**
 * Generate Article schema (main schema)
 */
export function generateArticleSchema(meta: ArticleMeta, url: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": meta.title,
    "description": meta.description,
    "image": meta.imageAlt ? {
      "@type": "ImageObject",
      "url": `${url}/images/articles/${meta.keyword.replace(/\s+/g, '-').toLowerCase()}.png`,
      "caption": meta.imageCaption || meta.description,
    } : undefined,
    "author": {
      "@type": "Person",
      "name": meta.author.name,
      "jobTitle": meta.author.role,
      "url": `https://winequickstart.com/about/${meta.author.slug}`,
    },
    "publisher": {
      "@type": "Organization",
      "name": "Wine Quick Start",
      "logo": {
        "@type": "ImageObject",
        "url": "https://winequickstart.com/logo.png",
      }
    },
    "datePublished": meta.pubDate,
    "dateModified": meta.modDate || meta.pubDate,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url,
    },
  };
}

/**
 * Generate FAQ schema for featured snippets
 */
export function generateFAQSchema(faqs: FAQItem[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      }
    }))
  };
}

/**
 * Generate HowTo schema for guide articles
 */
export function generateHowToSchema(
  name: string,
  description: string,
  steps: HowToStep[],
  totalTime?: string
): object {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": name,
    "description": description,
    "totalTime": totalTime || "PT15M",
    "step": steps.map((step, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "name": step.name,
      "text": step.text,
      "image": step.image,
    }))
  };
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(
  category: string,
  articleTitle: string,
  articleUrl: string
): object {
  const categoryNames: Record<string, string> = {
    'learn': 'Wine Guides',
    'wine-pairings': 'Wine Pairings',
    'buy': 'Buying Guides',
  };

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://winequickstart.com",
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": categoryNames[category] || category,
        "item": `https://winequickstart.com/${category}`,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": articleTitle,
        "item": articleUrl,
      }
    ]
  };
}

/**
 * Generate Product schema for wine recommendations
 */
export function generateWineProductSchema(wine: {
  name: string;
  producer: string;
  region: string;
  price?: number;
  rating?: number;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `${wine.producer} ${wine.name}`,
    "brand": {
      "@type": "Brand",
      "name": wine.producer,
    },
    "category": "Wine",
    "description": `${wine.name} from ${wine.region}`,
    ...(wine.price && {
      "offers": {
        "@type": "Offer",
        "priceCurrency": "USD",
        "price": wine.price,
        "availability": "https://schema.org/InStock",
      }
    }),
    ...(wine.rating && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": wine.rating,
        "bestRating": 5,
        "worstRating": 1,
      }
    }),
  };
}

/**
 * Generate combined schema for an article
 */
export function generateCombinedSchema(
  meta: ArticleMeta,
  url: string,
  faqs?: FAQItem[],
  howToSteps?: HowToStep[]
): object[] {
  const schemas: object[] = [];

  // Always include Article schema
  schemas.push(generateArticleSchema(meta, url));

  // Always include Breadcrumb schema
  schemas.push(generateBreadcrumbSchema(meta.category, meta.title, url));

  // Add FAQ schema if FAQs provided
  if (faqs && faqs.length > 0) {
    schemas.push(generateFAQSchema(faqs));
  }

  // Add HowTo schema for guide articles
  if (howToSteps && howToSteps.length > 0) {
    schemas.push(generateHowToSchema(
      `How to Choose ${meta.keyword}`,
      `Step-by-step guide to selecting the perfect ${meta.keyword}`,
      howToSteps
    ));
  }

  return schemas;
}

/**
 * Generate SEO-optimized title
 * Format: Primary Keyword - Compelling Hook (Brand optional)
 */
export function generateSEOTitle(keyword: string, category: string): string {
  const kw = keyword.toLowerCase();

  // Pairing articles
  if (kw.includes('with ') || kw.includes('pairing')) {
    const food = kw.replace(/^.*?with\s+/i, '').replace(/\s+pairing.*$/i, '').trim();
    const capitalFood = food.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return `Best Wine with ${capitalFood}: Sommelier Picks & Pairing Tips`;
  }

  // Budget articles
  if (/under\s+\$?\d+/.test(kw)) {
    const priceMatch = kw.match(/under\s+\$?(\d+)/);
    const price = priceMatch ? priceMatch[1] : '20';
    return `Best Wines Under $${price}: Top Picks That Taste Expensive`;
  }

  // Comparison articles
  if (/\bvs\b|versus/.test(kw)) {
    const wines = kw.split(/\s+vs\s+|\s+versus\s+/i);
    const w1 = wines[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const w2 = (wines[1] || '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return `${w1} vs ${w2}: Key Differences & When to Choose Each`;
  }

  // Default: capitalize and add hook
  const capitalKeyword = keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (category === 'buy') {
    return `${capitalKeyword}: Expert Buying Guide & Top Picks`;
  }

  if (category === 'wine-pairings') {
    return `${capitalKeyword}: Perfect Pairing Guide`;
  }

  return `${capitalKeyword}: Complete Guide from Sommeliers`;
}

/**
 * Generate canonical URL
 */
export function generateCanonicalUrl(category: string, slug: string): string {
  return `https://winequickstart.com/${category}/${slug}`;
}

/**
 * Extract FAQ items from article content (for schema generation)
 */
export function extractFAQsFromContent(content: string): FAQItem[] {
  const faqs: FAQItem[] = [];

  // Match FAQ pattern: <h3>Question?</h3> followed by <p>Answer</p>
  const faqRegex = /<h3[^>]*>([^<]+\?)<\/h3>\s*<p[^>]*>([^<]+)<\/p>/gi;
  let match;

  while ((match = faqRegex.exec(content)) !== null) {
    faqs.push({
      question: match[1].trim(),
      answer: match[2].trim(),
    });
  }

  return faqs;
}

export default {
  generateMetaDescription,
  generateArticleSchema,
  generateFAQSchema,
  generateHowToSchema,
  generateBreadcrumbSchema,
  generateWineProductSchema,
  generateCombinedSchema,
  generateSEOTitle,
  generateCanonicalUrl,
  extractFAQsFromContent,
  determineIntent,
};
