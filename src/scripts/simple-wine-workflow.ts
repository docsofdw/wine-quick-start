/**
 * Simple Wine Content Workflow
 * Generates wine pages using real DataForSEO data without Supabase dependency
 */

import { getDataForSEOClient } from '../lib/dataforseo-client.js';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load env vars
config({ path: '.env.local', override: true });

interface WineKeyword {
  keyword: string;
  volume: number;
  difficulty: number;
  priority: number;
}

class SimpleWineWorkflow {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('⚠️  Supabase not configured, will only create files');
      this.supabase = null;
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }
  
  /**
   * Main workflow: research keywords → generate pages
   */
  async runWorkflow(): Promise<void> {
    console.log('🍷 Starting simple wine content workflow...');
    
    try {
      // Step 1: Get top wine keywords
      const keywords = await this.getTopWineKeywords();
      console.log(`Found ${keywords.length} wine keywords`);
      
      // Step 2: Generate pages for top 5 keywords
      const topKeywords = keywords.slice(0, 5);
      for (const keyword of topKeywords) {
        await this.generateWinePage(keyword);
      }
      
      console.log(`✅ Generated ${topKeywords.length} wine pages successfully!`);
      
    } catch (error) {
      console.error('❌ Workflow failed:', error);
    }
  }

  /**
   * Get top wine keywords using real DataForSEO data
   */
  private async getTopWineKeywords(): Promise<WineKeyword[]> {
    console.log('🔍 Researching wine keywords...');
    
    const client = getDataForSEOClient();
    
    // Wine seed terms
    const wineSeeds = [
      'wine pairing',
      'pinot noir', 
      'chardonnay',
      'cabernet sauvignon',
      'natural wine',
      'bordeaux wine',
      'italian wine',
      'spanish wine'
    ];
    
    // Get keyword data
    const keywordData = await client.getKeywordData(wineSeeds);
    
    // Convert to our format and score
    const keywords: WineKeyword[] = keywordData.map(kw => {
      let priority = 5; // Base score
      
      // Volume bonus
      if (kw.search_volume > 10000) priority += 3;
      else if (kw.search_volume > 1000) priority += 2;
      else if (kw.search_volume > 100) priority += 1;
      
      // Low difficulty bonus
      if (kw.keyword_difficulty < 20) priority += 2;
      else if (kw.keyword_difficulty < 40) priority += 1;
      
      // Wine-specific bonus
      if (kw.keyword.includes('pairing')) priority += 1;
      if (kw.keyword.includes('wine')) priority += 1;
      
      return {
        keyword: kw.keyword,
        volume: kw.search_volume,
        difficulty: kw.keyword_difficulty,
        priority: Math.min(10, priority)
      };
    });
    
    return keywords
      .filter(kw => kw.volume > 50) // Minimum volume
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generate a wine page for a specific keyword
   */
  private async generateWinePage(keywordData: WineKeyword): Promise<void> {
    console.log(`📄 Generating page for "${keywordData.keyword}"`);
    
    const slug = keywordData.keyword
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, '-');
    
    const title = this.generateTitle(keywordData.keyword);
    const description = this.generateDescription(keywordData.keyword);
    const content = this.generateContent(keywordData.keyword);
    
    const astroContent = this.generateAstroFile({
      slug,
      title,
      description,
      keyword: keywordData.keyword,
      content,
      volume: keywordData.volume,
      difficulty: keywordData.difficulty
    });
    
    // Write file
    const filePath = path.join(process.cwd(), 'src/pages/wine-pairings', `${slug}.astro`);
    await fs.writeFile(filePath, astroContent);
    
    console.log(`✅ Created: ${slug}.astro (Volume: ${keywordData.volume}, KD: ${keywordData.difficulty})`);

    // Save to Supabase if available
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('wine_pages')
          .upsert({
            slug: slug,
            title: title,
            description: description,
            content: content.substring(0, 2000) + '...', // Truncate for database
            keywords: [keywordData.keyword, 'wine', 'guide'],
            status: 'published'
          });

        if (error) {
          console.log(`⚠️  Database save failed for ${slug}: ${error.message}`);
        } else {
          console.log(`💾 Saved to database: ${slug}`);
        }
      } catch (dbError) {
        console.log(`⚠️  Database error for ${slug}:`, dbError);
      }
    }
  }

  /**
   * Generate SEO-optimized title
   */
  private generateTitle(keyword: string): string {
    const templates = [
      `${this.capitalize(keyword)}: Complete Wine Guide 2024`,
      `Perfect ${this.capitalize(keyword)} - Expert Recommendations`,
      `${this.capitalize(keyword)}: Pairing Guide & Reviews`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate meta description
   */
  private generateDescription(keyword: string): string {
    return `Discover the perfect ${keyword} with our expert wine guide. Get professional recommendations, tasting notes, and food pairing suggestions from certified sommeliers.`;
  }

  /**
   * Generate wine content
   */
  private generateContent(keyword: string): string {
    const isVarietal = /pinot|chardonnay|cabernet|merlot|sauvignon/i.test(keyword);
    const isPairing = /pairing|food|with/i.test(keyword);
    
    if (isPairing) {
      return this.generatePairingContent(keyword);
    } else if (isVarietal) {
      return this.generateVarietalContent(keyword);
    } else {
      return this.generateGeneralWineContent(keyword);
    }
  }

  /**
   * Generate pairing-specific content
   */
  private generatePairingContent(keyword: string): string {
    return `
## Understanding ${this.capitalize(keyword)}

When it comes to ${keyword}, the key is understanding how wine characteristics complement your food. The fundamental principle is to match the intensity of both the wine and the dish.

## Expert Wine Recommendations

### Light & Delicate Options
**Sauvignon Blanc** - Crisp acidity cuts through rich dishes
- **Price Range**: $15-25
- **Best Producers**: Kim Crawford, Oyster Bay
- **Serving Temperature**: 45-50°F

**Pinot Noir** - Elegant and food-friendly
- **Price Range**: $20-35  
- **Best Producers**: La Crema, Bogle
- **Serving Temperature**: 60-65°F

### Bold & Full-Bodied Choices
**Cabernet Sauvignon** - Rich and powerful
- **Price Range**: $25-45
- **Best Producers**: Columbia Crest, 14 Hands
- **Serving Temperature**: 65-68°F

## BAT Framework Analysis

**Body**: Medium to full-bodied wines work best
**Acidity**: High acidity wines cleanse the palate
**Tannins**: Moderate tannins provide structure without overwhelming

## Food Pairing Principles

1. **Match Intensity**: Light wines with delicate dishes
2. **Consider Sauce**: Wine should complement the dominant flavors
3. **Regional Pairing**: Italian wines with Italian food
4. **Season Appropriately**: Light wines for summer, bold for winter

## Where to Buy

- **Total Wine**: Best selection and competitive pricing
- **Costco**: Excellent value for everyday wines  
- **Local Wine Shops**: Expert recommendations and unique finds
- **Online**: Wine.com and Vivino for convenience

## Serving Tips

- Decant full-bodied reds 30-60 minutes before serving
- Chill whites and light reds in refrigerator 2-3 hours
- Use proper glassware to enhance aromatics
- Serve at correct temperature for optimal flavor

## Expert's Final Recommendation

For ${keyword}, I recommend starting with a **medium-bodied wine with balanced acidity**. This provides the best foundation for most pairing situations while remaining approachable for beginners.
    `.trim();
  }

  /**
   * Generate varietal-specific content
   */
  private generateVarietalContent(keyword: string): string {
    return `
## ${this.capitalize(keyword)} Overview

${this.capitalize(keyword)} is one of the world's most beloved wine varietals, known for its distinctive character and food-friendly nature.

## Tasting Profile

### Primary Characteristics
- **Color**: Medium ruby to deep garnet
- **Aroma**: Cherry, berry, and subtle earthy notes
- **Palate**: Balanced fruit with moderate tannins
- **Finish**: Clean and lingering

### BAT Framework
**Body**: Medium-bodied with elegant structure
**Acidity**: Bright acidity provides freshness
**Tannins**: Soft, approachable tannins

## Top ${this.capitalize(keyword)} Recommendations

### Under $20
**Columbia Crest Grand Estates** - $12-15
- Great introduction to the varietal
- Consistent quality and availability
- Perfect for everyday drinking

### $20-40 Range  
**La Crema Sonoma Coast** - $25-30
- Complex and well-balanced
- Excellent food pairing wine
- From renowned California producer

### Premium ($40+)
**Domaine de la Côte Sta. Rita Hills** - $45-55
- Premium expression of the varietal  
- Limited production, cellar-worthy
- Investment-grade quality

## Food Pairing Guide

### Perfect Matches
- Grilled salmon and herb-crusted chicken
- Mushroom risotto and roasted vegetables
- Soft cheeses like Brie and Camembert
- Charcuterie and Mediterranean dishes

### Avoid Pairing With
- Very spicy foods that overpower the wine
- Heavy cream sauces that mask the fruit
- Strong blue cheeses that compete

## Storage & Serving

**Storage Temperature**: 55-60°F in wine refrigerator
**Serving Temperature**: 60-65°F (slightly chilled)  
**Decanting**: Not necessary but can enhance aromatics
**Glassware**: Burgundy-style glasses with wide bowl

## Investment Potential

${this.capitalize(keyword)} from top producers can age 10-15 years and appreciate in value. Look for limited releases and vineyard-designate wines.
    `.trim();
  }

  /**
   * Generate general wine content
   */
  private generateGeneralWineContent(keyword: string): string {
    return `
## ${this.capitalize(keyword)} Guide

Understanding ${keyword} requires knowledge of the key factors that influence quality, taste, and value.

## What Makes Great ${this.capitalize(keyword)}

### Key Quality Indicators
1. **Producer Reputation** - Established wineries with consistent track records
2. **Vintage Conditions** - Weather patterns during growing season
3. **Terroir Expression** - How the land influences the wine
4. **Winemaking Technique** - Traditional vs modern approaches

## Price Categories & Expectations

### Everyday Wines ($10-20)
- Simple, fruit-forward expressions
- Perfect for casual consumption
- Good introduction to the style

### Premium Range ($20-50)
- More complexity and depth
- Suitable for special occasions
- Often from renowned regions

### Luxury Tier ($50+)
- Exceptional quality and rarity
- Investment and collector potential
- Special occasion wines

## Regional Variations

Different regions produce distinct styles of ${keyword}:

- **Old World**: European wines with earthy, mineral character
- **New World**: Fruit-forward wines from New World regions
- **Climate Influence**: Cool vs warm climate expressions

## Buying Guide

### Where to Shop
1. **Local Wine Shops** - Expert advice and unique selections
2. **Grocery Stores** - Convenience and competitive pricing
3. **Online Retailers** - Vast selection and detailed reviews
4. **Wineries Direct** - Exclusive releases and tastings

### What to Look For
- Vintage date and storage conditions
- Producer reputation and awards
- Professional ratings and reviews
- Price point vs quality ratio

## Tasting & Evaluation

Learn to evaluate ${keyword} using professional techniques:

1. **Visual**: Color, clarity, and intensity
2. **Aroma**: Primary, secondary, and tertiary notes
3. **Palate**: Attack, mid-palate, and finish
4. **Structure**: Balance of fruit, acid, and tannin

## Expert Recommendations

For newcomers to ${keyword}, start with wines from established producers in the $15-25 range. This provides the best introduction to the style without breaking the budget.
    `.trim();
  }

  /**
   * Generate complete Astro file
   */
  private generateAstroFile(data: {
    slug: string;
    title: string;
    description: string;
    keyword: string;
    content: string;
    volume: number;
    difficulty: number;
  }): string {
    const mockWines = this.generateMockWineData(data.keyword);
    
    return `---
import ArticleLayout from '../../layouts/ArticleLayout.astro';

const frontmatter = {
  title: "${data.title}",
  description: "${data.description}",
  wine_type: "${this.determineWineType(data.keyword)}",
  author: "Wine Quick Start Expert",
  readTime: "6 min",
  expert_score: 8,
  structured_data: {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${data.title}",
    "description": "${data.description}",
    "author": {
      "@type": "Organization",
      "name": "Wine Quick Start"
    },
    "datePublished": "${new Date().toISOString()}",
    "dateModified": "${new Date().toISOString()}",
    "keywords": "${data.keyword}",
    "articleSection": "Wine Guides"
  },
  wines: ${JSON.stringify(mockWines, null, 2)}
};
---

<ArticleLayout title={frontmatter.title} description={frontmatter.description} author={frontmatter.author} readTime={frontmatter.readTime} category="Wine Guide" schema={frontmatter.structured_data}>
  <div slot="quick-answer">
    <p><strong>Quick Answer:</strong> For ${data.keyword}, focus on wines with balanced characteristics that complement food without overpowering. Look for quality producers and proper storage for the best experience.</p>
  </div>

  <div class="bg-wine-50 p-4 rounded-lg mb-8">
    <div class="flex justify-between items-center text-sm text-gray-600">
      <span>Search Volume: ${data.volume.toLocaleString()}/month</span>
      <span>Keyword Difficulty: ${data.difficulty}/100</span>
    </div>
  </div>

  ${this.formatContentForModernLayout(data.content)}

</ArticleLayout>`;
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Format content for modern layout with proper HTML structure
   */
  private formatContentForModernLayout(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('## ')) {
        // Close any open list before heading
        if (inList) {
          result.push('  </ul>');
          inList = false;
        }
        result.push(`  <h2>${trimmed.replace('## ', '')}</h2>`);
      } else if (trimmed.startsWith('### ')) {
        // Close any open list before subheading
        if (inList) {
          result.push('  </ul>');
          inList = false;
        }
        result.push(`  <h3>${trimmed.replace('### ', '')}</h3>`);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        // Start list if not already in one
        if (!inList) {
          result.push('  <ul>');
          inList = true;
        }
        result.push(`    <li>${trimmed.replace(/^[*-] /, '')}</li>`);
      } else {
        // Close any open list before paragraph
        if (inList) {
          result.push('  </ul>');
          inList = false;
        }
        result.push(`  <p>${trimmed}</p>`);
      }
    }

    // Close any remaining open list
    if (inList) {
      result.push('  </ul>');
    }

    return result.filter(line => line).join('\n\n');
  }

  /**
   * Generate mock wine data for recommendations
   */
  private generateMockWineData(keyword: string): any[] {
    const wineRegions = [
      'Burgundy, France', 'Tuscany, Italy', 'Napa Valley, California', 
      'Barossa Valley, Australia', 'Rioja, Spain', 'Douro, Portugal'
    ];
    const producers = ['Château', 'Domaine', 'Bodega', 'Estate'];
    const prices = ['32', '45', '58'];
    const ratings = ['90', '92', '94'];
    
    return Array.from({ length: 2 }, (_, i) => ({
      name: `${2020 + i} ${producers[i % producers.length]} ${this.generateWineName(keyword, i)}`,
      region: wineRegions[i % wineRegions.length],
      price: prices[i % prices.length],
      rating: ratings[i % ratings.length],
      type: this.determineWineType(keyword),
      notes: `Excellent example of ${keyword} with balanced flavors and great food pairing potential.`,
      link: `https://wine-searcher.com/find/${keyword.replace(/\s+/g, '-')}-${i + 1}`
    }));
  }

  /**
   * Generate wine name based on keyword
   */
  private generateWineName(keyword: string, index: number): string {
    const baseNames = ['Reserve', 'Premium Selection'];
    
    if (keyword.includes('pinot noir')) {
      return ['Reserve Pinot Noir', 'Estate Pinot'][index] || 'Pinot Noir';
    } else if (keyword.includes('chardonnay')) {
      return ['Barrel Fermented Chardonnay', 'Reserve Chardonnay'][index] || 'Chardonnay';
    } else if (keyword.includes('cabernet')) {
      return ['Cabernet Sauvignon Reserve', 'Estate Cabernet'][index] || 'Cabernet Sauvignon';
    }
    
    return baseNames[index % baseNames.length];
  }

  /**
   * Determine wine type from keyword
   */
  private determineWineType(keyword: string): string {
    if (keyword.includes('red') || keyword.includes('cabernet') || keyword.includes('merlot') || keyword.includes('pinot noir')) return 'red';
    if (keyword.includes('white') || keyword.includes('chardonnay') || keyword.includes('sauvignon blanc')) return 'white';
    if (keyword.includes('rosé') || keyword.includes('rose')) return 'rosé';
    if (keyword.includes('sparkling') || keyword.includes('champagne')) return 'sparkling';
    return 'red'; // default
  }
}

// Run workflow
const workflow = new SimpleWineWorkflow();
workflow.runWorkflow()
  .then(() => {
    console.log('🎉 Wine workflow completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Wine workflow failed:', error);
    process.exit(1);
  });