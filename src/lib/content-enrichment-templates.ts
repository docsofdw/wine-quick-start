/**
 * Content Enrichment Templates for Wine Articles
 *
 * These prompts generate deep, factual wine content to expand thin articles
 * into comprehensive, SEO-rich guides.
 *
 * Includes:
 * - History & Origins
 * - Terroir & Production
 * - Tasting Profiles
 * - Food Pairings
 * - Buying Guides
 * - Expert Tips
 * - FAQs (optimized for featured snippets)
 * - People Also Ask targeting
 * - HowTo steps for schema
 */

export interface ArticleContext {
  keyword: string;
  title: string;
  category: 'learn' | 'wine-pairings' | 'buy';
  existingWines?: string[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface HowToStep {
  name: string;
  text: string;
}

/**
 * Determine the type of content based on keyword analysis
 */
export function getContentType(keyword: string): 'varietal' | 'region' | 'pairing' | 'comparison' | 'buying' {
  const kw = keyword.toLowerCase();

  if (kw.includes(' vs ') || kw.includes(' versus ')) return 'comparison';
  if (kw.includes('pairing') || kw.includes('with ') || kw.includes('food')) return 'pairing';
  if (kw.includes('under $') || kw.includes('under 20') || kw.includes('under 50') || kw.includes('cheap') || kw.includes('buy') || kw.includes('best ')) return 'buying';

  // Check for regions
  const regions = ['bordeaux', 'burgundy', 'champagne', 'napa', 'sonoma', 'barolo', 'tuscany', 'rioja', 'willamette', 'oregon', 'california', 'piedmont'];
  if (regions.some(r => kw.includes(r))) return 'region';

  // Default to varietal for grape varieties
  return 'varietal';
}

/**
 * Generate the system prompt for wine content generation
 */
export function getSystemPrompt(): string {
  return `You are a Master Sommelier and wine writer with decades of experience. You write authoritative, educational wine content that is:

1. **Factually accurate** - Use real wine knowledge, actual producers, correct terminology
2. **Specific and detailed** - Include actual flavor descriptors, chemical components, terroir details
3. **Educational** - Explain the "why" behind wine characteristics
4. **Engaging** - Write in a warm, approachable tone that makes wine accessible
5. **SEO-optimized** - Naturally incorporate the target keyword and related terms

You never use generic filler content. Every sentence adds real value and information.

Format your responses in clean HTML that can be directly inserted into an Astro article. Use:
- <h2> for main sections
- <h3> for subsections
- <p> for paragraphs
- <ul>/<li> for lists
- <strong> for emphasis
- Use descriptive class names like "bg-wine-50", "text-wine-700" for wine-themed styling`;
}

/**
 * History & Origins section prompt
 */
export function getHistoryPrompt(context: ArticleContext): string {
  const { keyword } = context;
  const contentType = getContentType(keyword);

  if (contentType === 'region') {
    return `Write a comprehensive "History & Origins" section (300-400 words) for an article about "${keyword}".

Include:
- When winemaking began in this region (actual dates/centuries)
- Key historical events that shaped the region's wine identity
- Important figures or families in the region's wine history
- How the region gained its reputation
- Any classification systems or AOC/DOC establishment dates
- Modern developments and current status

Format as HTML with an <h2>History & Origins of [Region]</h2> heading.`;
  }

  if (contentType === 'varietal') {
    return `Write a comprehensive "Origins & History" section (300-400 words) for an article about "${keyword}".

Include:
- The grape variety's geographic origins
- DNA/parentage discoveries if known
- How the variety spread to other regions
- Historical significance and name etymology
- Key moments that elevated its reputation
- Current global plantings and trends

Format as HTML with an <h2>Origins & History</h2> heading.`;
  }

  return `Write a brief historical context section (200-250 words) about "${keyword}" that provides background and context for readers.

Format as HTML with an <h2>Background & Context</h2> heading.`;
}

/**
 * Terroir & Production section prompt
 */
export function getTerroirPrompt(context: ArticleContext): string {
  const { keyword } = context;
  const contentType = getContentType(keyword);

  if (contentType === 'region') {
    return `Write a detailed "Terroir & Climate" section (400-500 words) for an article about "${keyword}".

Include:
- **Climate**: Temperature ranges, rainfall, sunshine hours, vintage variation
- **Soils**: Specific soil types (limestone, clay, gravel, etc.) and their effects on wine
- **Geography**: Elevation, slopes, aspect, key vineyard areas/crus
- **Microclimate factors**: Rivers, mountains, fog influence
- How these factors translate to wine characteristics (be specific about flavors/textures)

Format as HTML with an <h2>Terroir & Climate</h2> heading and <h3> subheadings for each aspect.`;
  }

  if (contentType === 'varietal') {
    return `Write a detailed "Grape Characteristics & Winemaking" section (400-500 words) for an article about "${keyword}".

Include:
- **Viticulture**: Growing requirements, vigor, yields, harvest timing
- **In the winery**: Common fermentation techniques, oak vs steel, malolactic
- **Regional styles**: How the grape expresses differently by region
- **Quality indicators**: What separates good from great examples
- **Aging potential**: How wines evolve over time

Format as HTML with an <h2>Grape Characteristics & Winemaking</h2> heading.`;
  }

  return '';
}

/**
 * Tasting Profile section prompt
 */
export function getTastingProfilePrompt(context: ArticleContext): string {
  const { keyword } = context;
  const contentType = getContentType(keyword);

  if (contentType === 'region' || contentType === 'varietal') {
    return `Write a comprehensive "Tasting Profile" section (350-450 words) for an article about "${keyword}".

Include:
- **Appearance**: Color range, viscosity, what it indicates about age/style
- **Aromatics**: Primary (fruit), secondary (fermentation), tertiary (aging) aromas with SPECIFIC descriptors
- **Palate**: Body, acidity, tannin (if red), alcohol impression, texture
- **Flavor profile**: Specific fruits, spices, earth notes, mineral qualities
- **Finish**: Length, aftertaste characteristics
- **Quality markers**: What to look for in premium examples

Use professional tasting terminology but explain it for enthusiasts.

Format as HTML with an <h2>What Does [Wine] Taste Like?</h2> heading.`;
  }

  return '';
}

/**
 * Food Pairing section prompt
 */
export function getFoodPairingPrompt(context: ArticleContext): string {
  const { keyword } = context;
  const contentType = getContentType(keyword);

  if (contentType === 'pairing') {
    return `Write an extensive "Perfect Pairings" section (500-600 words) for an article about "${keyword}".

Include:
- **Why this pairing works**: The science/chemistry behind it (acidity cutting fat, tannins with protein, etc.)
- **Classic pairings**: Traditional combinations with explanation
- **Modern/creative pairings**: Contemporary takes that work well
- **Cooking methods**: How preparation affects pairing (grilled vs braised, etc.)
- **Sauces & seasonings**: How different sauces change the wine needs
- **What to avoid**: Pairings that don't work and why
- **Regional authenticity**: Traditional dishes from wine's homeland

Be specific with dishes and wines. Explain WHY each pairing works.

Format as HTML with an <h2>Perfect Food Pairings</h2> heading and organized subsections.`;
  }

  if (contentType === 'region' || contentType === 'varietal') {
    return `Write a "Food Pairing Guide" section (300-400 words) for an article about "${keyword}".

Include:
- 5-7 specific food pairings with explanation of why they work
- The flavor bridge concept for this wine
- Classic regional pairings
- Versatile everyday options
- Special occasion suggestions

Format as HTML with an <h2>Food Pairing Guide</h2> heading.`;
  }

  return '';
}

/**
 * Buying Guide section prompt
 */
export function getBuyingGuidePrompt(context: ArticleContext): string {
  const { keyword } = context;
  const contentType = getContentType(keyword);

  return `Write a "Buying Guide" section (350-450 words) for an article about "${keyword}".

Include:
- **Price tiers**: What to expect at different price points ($15-25, $25-50, $50-100, $100+)
- **Value picks**: Best quality-to-price ratio options
- **What to look for on labels**: Key terms, classifications, quality indicators
- **Vintage considerations**: Which years are drinking well, which to cellar
- **Where to buy**: Types of retailers, online options, auction considerations
- **Storage after purchase**: Immediate drinking vs cellaring advice

Be specific about actual price expectations for ${keyword}.

Format as HTML with an <h2>Buying Guide</h2> heading.`;
}

/**
 * Comparison section prompt (for vs articles)
 */
export function getComparisonPrompt(context: ArticleContext): string {
  const { keyword } = context;

  if (!keyword.includes(' vs ') && !keyword.includes(' versus ')) {
    return '';
  }

  const wines = keyword.split(/\s+vs\s+|\s+versus\s+/i);

  return `Write a detailed comparison section (500-600 words) comparing ${wines[0]} and ${wines[1]}.

Include a comparison covering:
- **Origins**: Where each comes from
- **Grape varieties**: What's in each
- **Flavor profiles**: Side-by-side taste comparison
- **Body & structure**: Weight, tannins, acidity differences
- **Food pairings**: Different dishes for each
- **Price points**: Typical cost comparison
- **When to choose each**: Occasions, preferences, food contexts
- **Can you substitute one for the other?**: Honest assessment

Create an HTML table comparing key attributes side by side.

Format as HTML with an <h2>Head-to-Head Comparison</h2> heading.`;
}

/**
 * Generate unique, topic-specific FAQs
 */
export function getFAQPrompt(context: ArticleContext): string {
  const { keyword } = context;

  return `Generate 6-8 unique, topic-specific FAQs for an article about "${keyword}".

Requirements:
- Questions must be specific to ${keyword}, NOT generic wine questions
- Include questions people actually search for (think featured snippets)
- Answers should be 2-4 sentences, informative and direct
- Cover: selection tips, serving, storage, value, common mistakes, alternatives

Do NOT include generic questions like "how do I store wine" unless specifically relevant.
DO include questions like "What's the difference between X and Y?" or "Is ${keyword} good for beginners?"

Format as HTML:
<div class="space-y-6">
  <div>
    <h3 class="text-lg font-semibold text-wine-700 mb-2">[Question]?</h3>
    <p class="text-gray-700">[Answer]</p>
  </div>
  ...
</div>`;
}

/**
 * Expert Tips section - topic-specific, not generic
 */
export function getExpertTipsPrompt(context: ArticleContext): string {
  const { keyword } = context;

  return `Generate 7-8 expert tips specifically for "${keyword}".

Requirements:
- Tips must be SPECIFIC to ${keyword}, not generic wine advice
- Include actionable, insider knowledge
- Cover: selection, serving temperature, decanting needs, glassware, aging, when to drink
- Each tip should teach something specific about ${keyword}

Format as HTML:
<ol class="list-decimal list-inside space-y-4 text-gray-700">
  <li><strong>[Tip Title]</strong> - [Detailed explanation specific to ${keyword}]</li>
  ...
</ol>`;
}

/**
 * Extended Wine Recommendations prompt
 */
export function getExtendedRecommendationsPrompt(context: ArticleContext): string {
  const { keyword, existingWines = [] } = context;

  const excludeList = existingWines.length > 0
    ? `\n\nDo NOT include these wines (already in article): ${existingWines.join(', ')}`
    : '';

  return `Recommend 6-8 additional wines for an article about "${keyword}".${excludeList}

For each wine provide:
- **Producer & Wine Name** (real wines that exist)
- **Region**
- **Approximate Price** (realistic current market)
- **Why It's Recommended**: 2-3 sentences on what makes it special
- **Best For**: Type of occasion/drinker

Include a mix of:
- 2 excellent value options (under $30)
- 2-3 mid-range gems ($30-60)
- 2 splurge-worthy options ($60+)
- 1 hidden gem/underrated pick

Format as HTML with styled cards:
<div class="grid md:grid-cols-2 gap-4 my-6">
  <div class="bg-gray-50 rounded-lg p-5 border border-gray-100">
    <h3 class="text-lg font-semibold text-wine-700 mb-1">[Wine Name]</h3>
    <p class="text-sm text-gray-600 mb-2">[Region] | ~$[Price]</p>
    <p class="text-gray-700 text-sm">[Why recommended]</p>
    <p class="text-xs text-wine-600 mt-2"><strong>Best for:</strong> [occasion]</p>
  </div>
  ...
</div>`;
}

/**
 * Aging & Cellaring section prompt
 */
export function getAgingPrompt(context: ArticleContext): string {
  const { keyword } = context;
  const contentType = getContentType(keyword);

  if (contentType === 'region' || contentType === 'varietal' || contentType === 'buying') {
    return `Write an "Aging & Cellaring Guide" section (250-350 words) for an article about "${keyword}".

Include:
- **Aging potential**: How long different quality levels can age
- **Peak drinking windows**: When to open different styles
- **How it evolves**: What changes over time (tannins, fruit, complexity)
- **Storage requirements**: Temperature, humidity, position
- **Signs of proper aging vs spoilage**

Be specific to ${keyword} - different wines age differently.

Format as HTML with an <h2>Aging & Cellaring</h2> heading.`;
  }

  return '';
}

/**
 * Master prompt that combines all sections based on article type
 */
export function getFullEnrichmentPrompt(context: ArticleContext): string {
  const contentType = getContentType(context.keyword);
  const prompts: string[] = [];

  // Always include these
  prompts.push(getHistoryPrompt(context));
  prompts.push(getExpertTipsPrompt(context));
  prompts.push(getFAQPrompt(context));

  // Conditional sections based on content type
  if (contentType === 'region' || contentType === 'varietal') {
    prompts.push(getTerroirPrompt(context));
    prompts.push(getTastingProfilePrompt(context));
    prompts.push(getFoodPairingPrompt(context));
    prompts.push(getAgingPrompt(context));
    prompts.push(getExtendedRecommendationsPrompt(context));
  }

  if (contentType === 'pairing') {
    prompts.push(getFoodPairingPrompt(context));
    prompts.push(getExtendedRecommendationsPrompt(context));
  }

  if (contentType === 'comparison') {
    prompts.push(getComparisonPrompt(context));
    prompts.push(getFoodPairingPrompt(context));
  }

  if (contentType === 'buying') {
    prompts.push(getBuyingGuidePrompt(context));
    prompts.push(getExtendedRecommendationsPrompt(context));
    prompts.push(getAgingPrompt(context));
  }

  return prompts.filter(p => p.length > 0).join('\n\n---\n\n');
}

/**
 * Estimate word count addition based on content type
 */
export function estimateWordAddition(keyword: string): number {
  const contentType = getContentType(keyword);

  const estimates: Record<string, number> = {
    region: 2000,     // History, terroir, tasting, pairing, aging, recommendations
    varietal: 1800,   // Similar to region
    pairing: 1200,    // Focus on pairing content
    comparison: 1400, // Comparison table + context
    buying: 1000,     // Buying guide + recommendations
  };

  return estimates[contentType] || 1200;
}

/**
 * People Also Ask (PAA) prompt for featured snippet targeting
 * These questions are designed to match Google's PAA boxes
 */
export function getPeopleAlsoAskPrompt(context: ArticleContext): string {
  const { keyword } = context;
  const contentType = getContentType(keyword);

  const basePrompt = `Generate 6-8 "People Also Ask" style questions and concise answers for "${keyword}".

CRITICAL REQUIREMENTS:
1. Questions must be EXACTLY what appears in Google's PAA boxes for this topic
2. Answers must be 40-60 words (optimal for featured snippets)
3. Start each answer with a DIRECT statement, then explain
4. Include the target keyword naturally in answers
5. Focus on questions with clear, definitive answers

Question types to include:
- "What is the best..." questions
- "How do I..." questions
- "Is [X] good for..." questions
- "What's the difference between..." questions
- "How much does..." questions
- "Can I..." questions`;

  const contentSpecific: Record<string, string> = {
    varietal: `
For this varietal, include questions about:
- Taste profile and characteristics
- Best food pairings
- Price expectations
- How to serve/store
- Comparison with similar wines`,

    region: `
For this wine region, include questions about:
- What makes wines from this region special
- Best producers/estates
- When to drink (aging)
- Price ranges
- How to identify quality`,

    pairing: `
For this food pairing, include questions about:
- Why this pairing works
- Alternative wine options
- What to avoid pairing
- Serving temperature
- Budget-friendly options`,

    buying: `
For this buying guide, include questions about:
- Best value options
- How to spot quality
- Where to buy
- Storage requirements
- Is it worth the price`,

    comparison: `
For this comparison, include questions about:
- Key differences
- Which is better for [X]
- Price comparison
- Taste differences
- When to choose each`,
  };

  return basePrompt + (contentSpecific[contentType] || '') + `

Format response as JSON array:
[
  {"question": "What is the best wine for...?", "answer": "The best wine for... is X because Y. This works well due to Z."},
  ...
]`;
}

/**
 * HowTo steps prompt for schema.org HowTo markup
 * Generates step-by-step guides that qualify for HowTo rich results
 */
export function getHowToStepsPrompt(context: ArticleContext): string {
  const { keyword } = context;
  const contentType = getContentType(keyword);

  let guide = '';

  if (contentType === 'pairing') {
    guide = `Create a step-by-step guide: "How to Pair Wine with ${keyword.replace(/pairing|wine|with/gi, '').trim()}"

Steps should cover:
1. Assess the main protein/dish
2. Consider cooking method and sauces
3. Match wine weight to food weight
4. Consider flavor bridges
5. Test and adjust`;
  } else if (contentType === 'buying') {
    guide = `Create a step-by-step guide: "How to Buy ${keyword.replace(/buy|buying|guide/gi, '').trim()}"

Steps should cover:
1. Set your budget range
2. Research producers/regions
3. Read the label correctly
4. Check vintage appropriateness
5. Verify storage/freshness`;
  } else if (contentType === 'varietal' || contentType === 'region') {
    guide = `Create a step-by-step guide: "How to Choose ${keyword}"

Steps should cover:
1. Identify your taste preferences
2. Consider the occasion
3. Set a budget
4. Research quality producers
5. Check reviews/ratings
6. Verify proper storage`;
  } else {
    guide = `Create a step-by-step guide: "How to Select ${keyword}"

Steps should cover:
1. Define your needs
2. Research options
3. Compare quality levels
4. Check prices
5. Make your selection`;
  }

  return guide + `

REQUIREMENTS:
- 5-7 clear, actionable steps
- Each step 20-40 words
- Use imperative verbs (Check, Select, Consider)
- Include specific, helpful details

Format as JSON array:
[
  {"name": "Step Name", "text": "Detailed step instructions..."},
  ...
]`;
}

/**
 * Quick Answer prompt for featured snippets
 * Generates the perfect 40-60 word answer for position zero
 */
export function getQuickAnswerPrompt(context: ArticleContext): string {
  const { keyword } = context;

  return `Write a 40-60 word featured snippet answer for the query "${keyword}".

REQUIREMENTS:
1. Start with a direct answer in the first sentence
2. Include the keyword naturally
3. Add 1-2 supporting details
4. End with a specific recommendation or tip
5. Be authoritative but accessible

The answer should be self-contained and directly answer what someone searching for "${keyword}" wants to know.

Format: Plain text, no formatting, 40-60 words exactly.`;
}

/**
 * Internal linking suggestions prompt
 * Generates related topic suggestions for internal links
 */
export function getInternalLinkingSuggestionsPrompt(context: ArticleContext): string {
  const { keyword, category } = context;

  return `For an article about "${keyword}" in the ${category} category, suggest 5-8 related topics that should be internally linked.

Consider:
- Related wine varietals
- Complementary food pairings
- Similar regions
- Price tier alternatives
- Seasonal relevance

Format as JSON array:
[
  {"topic": "Related Topic", "relevance": "Why this connects to ${keyword}", "anchorText": "suggested anchor text"},
  ...
]`;
}

/**
 * Meta description variations prompt
 * Generates multiple meta description options to A/B test
 */
export function getMetaDescriptionVariationsPrompt(context: ArticleContext): string {
  const { keyword, category } = context;

  return `Generate 3 meta description variations for an article about "${keyword}" (${category} category).

REQUIREMENTS:
- Each exactly 150-160 characters
- Include the keyword naturally
- Include a call-to-action or value proposition
- Make each variation distinct:
  1. Benefit-focused (what reader will learn/gain)
  2. Authority-focused (expert/sommelier angle)
  3. Action-focused (immediate value/tips)

Format as JSON array:
[
  {"type": "benefit", "description": "..."},
  {"type": "authority", "description": "..."},
  {"type": "action", "description": "..."}
]`;
}
