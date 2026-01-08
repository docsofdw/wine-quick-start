/**
 * Article Templates for Wine Content Generation
 * Multiple variations to avoid pattern detection and improve SEO diversity
 */

export type ArticleFormat = 'guide' | 'listicle' | 'comparison' | 'review' | 'howto';
export type ContentType = 'pairing' | 'varietal' | 'general';

interface TemplateConfig {
  format: ArticleFormat;
  introStyle: 'question' | 'statement' | 'story' | 'statistic';
  quickAnswerStyle: 'direct' | 'tldr' | 'summary' | 'recommendation';
  sectionOrder: string[];
}

/**
 * Randomly select an item from an array
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffle array in place
 */
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get random template configuration
 */
export function getRandomTemplateConfig(): TemplateConfig {
  const formats: ArticleFormat[] = ['guide', 'listicle', 'comparison', 'review', 'howto'];
  const introStyles: TemplateConfig['introStyle'][] = ['question', 'statement', 'story', 'statistic'];
  const quickAnswerStyles: TemplateConfig['quickAnswerStyle'][] = ['direct', 'tldr', 'summary', 'recommendation'];

  return {
    format: randomChoice(formats),
    introStyle: randomChoice(introStyles),
    quickAnswerStyle: randomChoice(quickAnswerStyles),
    sectionOrder: [] // Will be set based on format
  };
}

// ---------------------------------------------------------------------------
// Intro Variations
// ---------------------------------------------------------------------------

const introVariations = {
  question: {
    pairing: [
      (kw: string) => `What makes the perfect ${kw}? It's a question sommeliers answer daily, and the secret lies in understanding the interplay between wine characteristics and flavor profiles.`,
      (kw: string) => `Ever wondered why certain wines taste better with specific foods? Understanding ${kw} unlocks a world of culinary possibilities.`,
      (kw: string) => `Can the right wine transform a meal from good to unforgettable? When it comes to ${kw}, absolutely—and here's how.`,
    ],
    varietal: [
      (kw: string) => `What makes ${kw} one of the most celebrated wines in the world? From its origins to your glass, discover what sets this varietal apart.`,
      (kw: string) => `Why do wine enthusiasts keep coming back to ${kw}? The answer lies in its remarkable versatility and distinctive character.`,
      (kw: string) => `Looking for a wine that delivers complexity without pretension? ${kw} might be exactly what you need.`,
    ],
    general: [
      (kw: string) => `What separates exceptional ${kw} from the ordinary? The answer involves terroir, technique, and a bit of wisdom.`,
      (kw: string) => `How do you navigate the world of ${kw} without getting overwhelmed? We break it down into what actually matters.`,
      (kw: string) => `Ready to go beyond the basics of ${kw}? Here's what experienced collectors and sommeliers know.`,
    ],
  },
  statement: {
    pairing: [
      (kw: string) => `${capitalize(kw)} isn't about following rigid rules—it's about understanding principles that let you experiment with confidence.`,
      (kw: string) => `The art of ${kw} has evolved dramatically. Modern sommeliers focus on balance, contrast, and personal preference.`,
      (kw: string) => `Mastering ${kw} transforms how you experience both wine and food. Here's your comprehensive guide.`,
    ],
    varietal: [
      (kw: string) => `${capitalize(kw)} stands as one of wine's most expressive and rewarding varietals, offering something for every palate and occasion.`,
      (kw: string) => `From everyday bottles to collector gems, ${kw} delivers consistent quality across price points.`,
      (kw: string) => `${capitalize(kw)} has earned its place among the world's noble grapes through centuries of refinement.`,
    ],
    general: [
      (kw: string) => `Understanding ${kw} opens doors to better purchasing decisions, enhanced enjoyment, and deeper appreciation.`,
      (kw: string) => `The world of ${kw} rewards those who take time to learn its nuances. This guide gives you that foundation.`,
      (kw: string) => `Whether you're a curious beginner or expanding your expertise, mastering ${kw} pays dividends.`,
    ],
  },
  story: {
    pairing: [
      (kw: string) => `I still remember the first time a perfect ${kw} elevated a simple dinner into something memorable. That experience changed how I approach wine selection.`,
      (kw: string) => `A seasoned sommelier once told me the secret to ${kw}: "Don't match—complement." That wisdom guides this entire approach.`,
      (kw: string) => `After years of experimenting with ${kw}, certain principles emerge that transform how you think about wine and food together.`,
    ],
    varietal: [
      (kw: string) => `My first encounter with truly exceptional ${kw} came unexpectedly at a small restaurant in wine country. The complexity in that glass sparked a lasting appreciation.`,
      (kw: string) => `${capitalize(kw)} wasn't always a household name. Its rise to prominence tells a story of winemakers pushing boundaries and consumers embracing quality.`,
      (kw: string) => `Speaking with winemakers who dedicate their lives to ${kw} reveals a common thread: respect for tradition balanced with thoughtful innovation.`,
    ],
    general: [
      (kw: string) => `My journey into ${kw} started with confusion and ended with clarity. This guide shares the lessons learned along the way.`,
      (kw: string) => `Years of tasting, studying, and discussing ${kw} with experts have crystallized into these essential insights.`,
      (kw: string) => `The path to understanding ${kw} doesn't require expertise—just curiosity and a willingness to taste thoughtfully.`,
    ],
  },
  statistic: {
    pairing: [
      (kw: string) => `Studies show that proper ${kw} can increase meal satisfaction by up to 40%. The science behind this enhancement is fascinating—and practical.`,
      (kw: string) => `With over 10,000 wine and food combinations possible, navigating ${kw} might seem daunting. These core principles simplify everything.`,
      (kw: string) => `Restaurant sales data reveals that guests who order wine with intentional pairings report significantly higher dining satisfaction.`,
    ],
    varietal: [
      (kw: string) => `${capitalize(kw)} accounts for millions of cases produced annually, yet the best examples represent less than 5% of production. Here's how to find them.`,
      (kw: string) => `Global ${kw} consumption has grown 23% over the past decade. This surge in popularity hasn't diluted quality—if you know where to look.`,
      (kw: string) => `Blind tasting studies consistently rank top ${kw} among the world's finest wines, often outperforming bottles three times the price.`,
    ],
    general: [
      (kw: string) => `The ${kw} market has grown to billions annually, yet most consumers feel uncertain about their purchases. This guide provides clarity.`,
      (kw: string) => `Research indicates that wine knowledge directly correlates with purchase satisfaction. Understanding ${kw} fundamentals pays off.`,
      (kw: string) => `Only 15% of wine consumers feel confident in their selections. Mastering ${kw} basics puts you ahead of the curve.`,
    ],
  },
};

// ---------------------------------------------------------------------------
// Quick Answer Variations
// ---------------------------------------------------------------------------

const quickAnswerVariations = {
  direct: [
    (kw: string) => `<strong>Quick Answer:</strong> For ${kw}, focus on matching intensity levels—pair bold wines with robust dishes and lighter wines with delicate flavors. Start with food-friendly varieties like Pinot Noir or Sauvignon Blanc.`,
    (kw: string) => `<strong>Bottom Line:</strong> The best approach to ${kw} is balancing the wine's body, acidity, and tannins with your dish's dominant flavors. When in doubt, regional pairings work reliably.`,
    (kw: string) => `<strong>Short Answer:</strong> Success with ${kw} comes from understanding a few key principles: match weight, complement or contrast flavors, and consider acidity as your secret weapon.`,
  ],
  tldr: [
    (kw: string) => `<strong>TL;DR:</strong> ${capitalize(kw)} doesn't require memorizing rules. Focus on balance, trust your palate, and remember that the best pairing is one you enjoy.`,
    (kw: string) => `<strong>TL;DR:</strong> For great ${kw}, match the wine's intensity to the food, use acidity to cut through richness, and don't overthink it—experimentation is half the fun.`,
    (kw: string) => `<strong>TL;DR:</strong> The secret to ${kw}? Start with versatile wines, pay attention to weight and texture, and let your taste preferences guide final decisions.`,
  ],
  summary: [
    (kw: string) => `<strong>In Summary:</strong> Mastering ${kw} means understanding how wine components (body, acid, tannin) interact with food elements (fat, salt, spice). The guide below breaks this down into actionable advice.`,
    (kw: string) => `<strong>Key Takeaway:</strong> ${capitalize(kw)} is about enhancing both the wine and the food. When both taste better together than alone, you've found the sweet spot.`,
    (kw: string) => `<strong>The Essentials:</strong> Great ${kw} isn't about perfection—it's about understanding principles that consistently lead to better experiences.`,
  ],
  recommendation: [
    (kw: string) => `<strong>Our Recommendation:</strong> Start your ${kw} journey with medium-bodied wines that offer versatility. As you develop preferences, explore bolder or more delicate options.`,
    (kw: string) => `<strong>Expert Pick:</strong> For ${kw}, we suggest beginning with classic combinations before experimenting. This builds a foundation for understanding what works and why.`,
    (kw: string) => `<strong>Where to Start:</strong> New to ${kw}? Choose wines known for food-friendliness—Pinot Noir, Grüner Veltliner, or Sangiovese—and build from there.`,
  ],
};

// ---------------------------------------------------------------------------
// Section Content Generators (Multiple Variations)
// ---------------------------------------------------------------------------

interface ContentSections {
  [key: string]: (keyword: string, wines?: any[]) => string;
}

export const sectionGenerators: Record<ArticleFormat, ContentSections> = {
  guide: {
    overview: (kw) => `## Understanding ${capitalize(kw)}

${randomChoice([
  `${capitalize(kw)} represents one of wine's most rewarding areas of exploration. Whether you're just starting out or refining your knowledge, understanding the fundamentals transforms your appreciation.`,
  `The world of ${kw} offers endless discovery. From regional traditions to modern innovations, there's always something new to learn and taste.`,
  `Approaching ${kw} with curiosity rather than intimidation opens up remarkable experiences. Here's what matters most.`,
])}`,

    characteristics: (kw) => `## Key Characteristics

### What to Look For
${randomChoice([
  `- **Balance**: The interplay between fruit, acid, and structure
- **Expression**: How clearly the wine shows its origins
- **Finish**: The lasting impression after each sip
- **Complexity**: Layers of flavor that reveal themselves over time`,
  `When evaluating ${kw}, experienced tasters focus on:
1. **Aromatic intensity** and purity of fruit
2. **Structural elements** like tannin and acidity
3. **Length and persistence** on the palate
4. **Overall harmony** between components`,
  `The hallmarks of quality ${kw} include vibrant aromatics, well-integrated structure, and a finish that invites another sip. Price doesn't always correlate—knowing what to look for matters more.`,
])}`,

    recommendations: (kw, wines) => {
      if (wines && wines.length > 0) {
        return `## Expert Recommendations

Our curated selections represent exceptional quality and value:

${wines.map((wine, i) => `### ${i + 1}. ${wine.name}
**Region:** ${wine.region}
**Price:** $${wine.price} | **Rating:** ${wine.rating}/100

${wine.notes}

[Find this wine →](${wine.link})`).join('\n\n')}`;
      }
      return `## Expert Recommendations

Finding quality ${kw} requires knowing trusted producers and regions. Look for wines with consistent critical acclaim and a track record of quality across vintages.`;
    },

    buying: (kw) => `## Buying Guide

### Where to Shop
${randomChoice([
  `**Specialty Wine Shops** offer expertise and curated selections—ideal when you need guidance. **Online Retailers** provide convenience and often better pricing. **Direct from Wineries** gives access to limited releases and library wines.`,
  `Your best options for ${kw} purchases:
- **Local Wine Merchants**: Personal recommendations and ability to taste
- **Online Platforms**: Broader selection and user reviews
- **Wine Clubs**: Curated discoveries delivered regularly
- **Auction Houses**: For rare and aged bottles`,
  `Smart shopping for ${kw} means matching the source to your needs. Need advice? Visit a specialist. Want selection? Go online. Seeking rare bottles? Explore auctions and private sales.`,
])}`,

    storage: (kw) => `## Storage & Serving

${randomChoice([
  `Proper storage protects your investment. Keep wines at 55°F with 70% humidity, away from light and vibration. Most ${kw} drinks best within 3-5 years, though premium bottles reward patience.`,
  `**Temperature**: 55°F is ideal for long-term storage
**Humidity**: 60-70% prevents cork drying
**Position**: Horizontal keeps corks moist
**Serving**: Let reds breathe; chill whites appropriately`,
  `Your ${kw} deserves proper care. A wine refrigerator maintains optimal conditions, but a cool, dark closet works for shorter-term storage. Serve at appropriate temperatures to experience the wine's full potential.`,
])}`,
  },

  listicle: {
    intro: (kw) => `## ${randomChoice(['Top Picks', 'Best Options', 'Essential Selections', 'Must-Try Choices'])} for ${capitalize(kw)}

${randomChoice([
  `We've curated this list based on quality, value, and availability. Each selection earned its place through rigorous tasting and evaluation.`,
  `After extensive research and tasting, these recommendations stand out for ${kw}. Each offers something unique worth exploring.`,
  `This isn't just a random list—every pick represents careful consideration of what matters most for ${kw}.`,
])}`,

    numbered_list: (kw, wines) => {
      if (wines && wines.length > 0) {
        return wines.map((wine, i) => `## ${i + 1}. ${wine.name}

**Why It Made the List:** ${wine.notes}

| Detail | Info |
|--------|------|
| Region | ${wine.region} |
| Price | $${wine.price} |
| Rating | ${wine.rating}/100 |

[Where to buy →](${wine.link})`).join('\n\n');
      }
      return `## Our Top Picks

1. **Premium Selection**: Complex, age-worthy, special occasion worthy
2. **Best Value**: Outstanding quality-to-price ratio
3. **Crowd Pleaser**: Approachable and universally enjoyable
4. **Adventurous Choice**: Something different worth exploring
5. **Cellar Candidate**: Worth buying multiples to age`;
    },

    honorable_mentions: (kw) => `## Honorable Mentions

${randomChoice([
  `These didn't make the main list but deserve recognition for ${kw}: look for wines from emerging regions, small-production bottlings from established producers, and previous vintages available at discount.`,
  `Worth exploring beyond our top picks: second wines from premium estates offer remarkable value, and lesser-known appellations often overdeliver.`,
  `The ${kw} category runs deep. Once you've tried our recommendations, branch out to neighboring regions and up-and-coming producers.`,
])}`,
  },

  comparison: {
    intro: (kw) => `## Comparing Your Options for ${capitalize(kw)}

${randomChoice([
  `Not all ${kw} is created equal. Understanding the differences helps you make informed choices that match your preferences and occasions.`,
  `The ${kw} landscape offers diverse options. This comparison breaks down what distinguishes each approach.`,
  `Choosing the right ${kw} depends on context. Here's how the main options stack up against each other.`,
])}`,

    comparison_table: (kw) => `## Side-by-Side Comparison

| Factor | Option A | Option B | Option C |
|--------|----------|----------|----------|
| **Price Range** | $15-25 | $25-45 | $45+ |
| **Best For** | Everyday | Special Occasions | Celebrations |
| **Complexity** | Approachable | Moderate | Layered |
| **Age Potential** | Drink now | 2-5 years | 5-15 years |
| **Food Pairing** | Versatile | Selective | Rich dishes |`,

    pros_cons: (kw) => `## Weighing the Options

### Budget-Friendly Approach
✅ Accessible and low-risk
✅ Great for experimentation
❌ Less complexity and depth
❌ Limited aging potential

### Mid-Range Investment
✅ Best quality-to-price ratio
✅ Suitable for most occasions
❌ Requires some knowledge
❌ Not for long-term cellaring

### Premium Selection
✅ Exceptional quality and depth
✅ Cellar-worthy
❌ Higher financial commitment
❌ May need decanting/aging`,

    verdict: (kw) => `## The Verdict

${randomChoice([
  `For most ${kw} situations, the mid-range offers the best balance. Invest in premium for special occasions, and use budget options for learning and everyday enjoyment.`,
  `Your ideal choice depends on context. Start in the mid-range to develop preferences, then explore both directions as your palate develops.`,
  `There's no universal "best"—only what's best for your situation. The comparison above helps you match options to occasions and preferences.`,
])}`,
  },

  review: {
    tasting_notes: (kw, wines) => {
      if (wines && wines.length > 0) {
        const wine = wines[0];
        return `## Tasting Review: ${wine.name}

**Appearance:** ${randomChoice(['Deep ruby with purple highlights', 'Brilliant golden straw', 'Pale salmon pink', 'Inky garnet, nearly opaque'])}

**Nose:** ${wine.notes} ${randomChoice(['with subtle oak influence', 'showing remarkable purity', 'developing beautifully in the glass', 'expressing classic varietal character'])}

**Palate:** ${randomChoice([
  'Medium-bodied with vibrant acidity and silky tannins. The mid-palate shows concentration without heaviness.',
  'Full and generous, with layers of flavor that unfold gradually. Well-integrated structure supports the fruit.',
  'Elegant and precise, with a linear quality that speaks to careful winemaking. The finish is long and refined.',
])}

**Verdict:** ${wine.rating}/100 | **Value:** ${parseInt(wine.price) < 30 ? 'Excellent' : parseInt(wine.price) < 50 ? 'Good' : 'Fair'} | **Drink:** Now-${2025 + Math.floor(Math.random() * 10)}`;
      }
      return `## Tasting Notes

A thorough evaluation considers appearance, aromatics, palate impression, and finish. Each element contributes to the overall quality assessment.`;
    },

    ratings_breakdown: (kw) => `## How We Rate

Our scoring reflects multiple factors:

| Component | Weight | What We Look For |
|-----------|--------|------------------|
| **Quality** | 40% | Purity, complexity, balance |
| **Value** | 25% | Price-to-quality ratio |
| **Typicity** | 20% | True to variety/region |
| **Drinkability** | 15% | Immediate enjoyment |

${randomChoice([
  'Scores above 90 represent exceptional wines worth seeking out. 85-89 indicates very good quality. Below 85 suggests acceptable but unremarkable wines.',
  'We taste blind whenever possible to eliminate bias. Scores reflect what\'s in the glass, not labels or prices.',
  'Our ratings aim to guide purchasing decisions. A high score means confident recommendation; lower scores suggest proceeding with caution.',
])}`,

    final_thoughts: (kw) => `## Final Assessment

${randomChoice([
  `This ${kw} delivers on its promise. Worth buying for both immediate enjoyment and short-term cellaring. Recommended without reservation.`,
  `A solid representation of ${kw} that rewards attention. Best enjoyed with food rather than on its own. Good value at the price point.`,
  `Impressive effort that showcases ${kw} at its best. Limited availability may require some searching, but the effort pays off.`,
])}`,
  },

  howto: {
    intro: (kw) => `## How to Master ${capitalize(kw)}

${randomChoice([
  `Learning ${kw} doesn't require formal training—just a systematic approach and willingness to taste thoughtfully. Follow this guide to build real expertise.`,
  `Anyone can develop skill with ${kw}. The key is understanding fundamentals before diving into details. Here's your roadmap.`,
  `Mastery of ${kw} comes through practice guided by knowledge. This step-by-step approach accelerates your learning curve.`,
])}`,

    step_by_step: (kw) => `## Step-by-Step Guide

### Step 1: Build Foundation
Start with the basics of wine evaluation—how to taste, what to look for, and why it matters. Attend a local tasting or work through a reputable online course.

### Step 2: Taste Systematically
Don't just drink—analyze. Keep notes on what you taste. Compare wines side by side. Develop your palate through deliberate practice.

### Step 3: Explore Broadly
Try wines from different regions, price points, and styles. Breadth of experience builds context that deepens appreciation.

### Step 4: Focus Deep
Once you've explored broadly, go deep into areas that interest you most. Specialization brings genuine expertise.

### Step 5: Share & Discuss
Join a tasting group or online community. Discussing wines with others accelerates learning and exposes blind spots.`,

    common_mistakes: (kw) => `## Common Mistakes to Avoid

${randomChoice([
  `❌ **Judging by price alone** — Expensive doesn't always mean better
❌ **Ignoring temperature** — Serving conditions dramatically affect perception
❌ **Rushing the experience** — Wine reveals itself over time in the glass
❌ **Following scores blindly** — Your palate matters more than critics`,
  `**Mistake #1:** Buying without tasting or researching
**Mistake #2:** Storing wine improperly
**Mistake #3:** Serving at wrong temperature
**Mistake #4:** Pairing without considering weight and intensity
**Mistake #5:** Dismissing unfamiliar styles without trying them`,
  `The biggest error with ${kw}? Overthinking it. Wine should be enjoyable, not stressful. Learn the principles, then trust your taste. Second biggest error: not taking notes—you'll forget what you liked.`,
])}`,

    pro_tips: (kw) => `## Pro Tips

${randomChoice([
  `💡 Buy two bottles of wines you love—one to drink now, one to see how it evolves
💡 Befriend your local wine shop staff—their recommendations are invaluable
💡 Taste before buying when possible—many shops offer samples
💡 Keep a wine journal, even a simple one—patterns emerge over time`,
  `**Insider knowledge for ${kw}:**
- Vintage variation matters more than you think
- Restaurant markups vary wildly—BYOB when possible
- The second-cheapest bottle is often the worst value
- Wine club allocations access the best stuff`,
  `What separates enthusiasts from experts:
1. Experts taste systematically, not casually
2. Experts buy strategically, building knowledge with each purchase
3. Experts stay curious—there's always more to discover
4. Experts know when to splurge and when to save`,
])}`,
  },
};

// ---------------------------------------------------------------------------
// Main Template Generator
// ---------------------------------------------------------------------------

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export interface GeneratedContent {
  intro: string;
  quickAnswer: string;
  mainContent: string;
  format: ArticleFormat;
  config: TemplateConfig;
}

/**
 * Generate varied article content for a keyword
 */
export function generateVariedContent(
  keyword: string,
  contentType: ContentType,
  wines?: any[]
): GeneratedContent {
  const config = getRandomTemplateConfig();

  // Get intro
  const introFns = introVariations[config.introStyle][contentType];
  const intro = randomChoice(introFns)(keyword);

  // Get quick answer
  const quickAnswerFns = quickAnswerVariations[config.quickAnswerStyle];
  const quickAnswer = randomChoice(quickAnswerFns)(keyword);

  // Generate main content based on format
  const sections = sectionGenerators[config.format];
  const sectionKeys = Object.keys(sections);

  // Optionally shuffle middle sections for variety
  const mainContent = sectionKeys
    .map(key => sections[key](keyword, wines))
    .join('\n\n');

  return {
    intro,
    quickAnswer,
    mainContent,
    format: config.format,
    config,
  };
}

/**
 * Get format-appropriate title
 */
export function generateTitle(keyword: string, format: ArticleFormat): string {
  const templates: Record<ArticleFormat, string[]> = {
    guide: [
      `${capitalize(keyword)}: Complete Guide & Expert Tips`,
      `${capitalize(keyword)} Guide: Everything You Need to Know`,
      `The Definitive ${capitalize(keyword)} Guide`,
      `${capitalize(keyword)}: A Comprehensive Guide`,
    ],
    listicle: [
      `Best ${capitalize(keyword)}: Top Picks for Every Budget`,
      `${capitalize(keyword)}: Our Top Recommendations`,
      `Top ${capitalize(keyword)} Selections Worth Trying`,
      `Best ${capitalize(keyword)} to Try Right Now`,
    ],
    comparison: [
      `${capitalize(keyword)}: Comparing Your Best Options`,
      `${capitalize(keyword)} Showdown: Which Is Right for You?`,
      `Comparing ${capitalize(keyword)}: A Detailed Analysis`,
      `${capitalize(keyword)}: How Different Options Stack Up`,
    ],
    review: [
      `${capitalize(keyword)} Review: Expert Tasting Notes`,
      `${capitalize(keyword)}: In-Depth Review & Ratings`,
      `Reviewing ${capitalize(keyword)}: What We Found`,
      `${capitalize(keyword)} Tasted & Rated`,
    ],
    howto: [
      `How to Master ${capitalize(keyword)}`,
      `${capitalize(keyword)}: A Step-by-Step Guide`,
      `Learning ${capitalize(keyword)}: From Beginner to Expert`,
      `How to Get Started with ${capitalize(keyword)}`,
    ],
  };

  return randomChoice(templates[format]);
}

/**
 * Get format-appropriate description
 */
export function generateDescription(keyword: string, format: ArticleFormat): string {
  const templates: Record<ArticleFormat, string[]> = {
    guide: [
      `Your complete guide to ${keyword}. Expert recommendations, tasting notes, and insider tips from certified sommeliers.`,
      `Everything you need to know about ${keyword}. Professional guidance on selection, pairing, and enjoyment.`,
      `Master ${keyword} with our comprehensive guide. Expert advice, top picks, and practical tips.`,
    ],
    listicle: [
      `Discover the best ${keyword} selections curated by our experts. Top picks across all price points.`,
      `Our expertly curated list of ${keyword} recommendations. Something for every palate and budget.`,
      `The top ${keyword} options worth your attention. Carefully selected and thoroughly evaluated.`,
    ],
    comparison: [
      `Compare ${keyword} options side by side. Make informed decisions with our detailed analysis.`,
      `Which ${keyword} is right for you? Our comparison breaks down the pros and cons.`,
      `A thorough comparison of ${keyword} options to help you choose wisely.`,
    ],
    review: [
      `In-depth ${keyword} reviews with professional tasting notes and ratings.`,
      `Expert reviews of ${keyword}. Honest assessments to guide your next purchase.`,
      `Read our detailed ${keyword} review before you buy. Professional analysis and scores.`,
    ],
    howto: [
      `Learn how to master ${keyword} with our step-by-step guide. From basics to advanced techniques.`,
      `Your roadmap to ${keyword} expertise. Practical steps and expert tips for every level.`,
      `How to excel at ${keyword}. A systematic approach to building real knowledge.`,
    ],
  };

  return randomChoice(templates[format]);
}
