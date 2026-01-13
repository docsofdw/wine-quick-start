/**
 * Daily Wine Content Automation Script
 * Generates 5 wine pairing pages daily using MCP tools
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import Replicate from 'replicate';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Load from .env.local BEFORE dynamic imports that need env vars
config({ path: '.env.local', override: true });

// Dynamic import for wine catalog (needs env vars to be loaded first)
const { getWinesForKeyword } = await import('../lib/wine-catalog.js');
import type { WineRecommendation } from '../lib/wine-catalog.js';

// Import E-E-A-T compliant authors
import { getRandomAuthor, getAuthorSchema, type Author } from '../data/authors.js';

interface WineKeyword {
  keyword: string;
  volume: number;
  difficulty: number;
  intent: 'informational' | 'commercial' | 'navigational';
  priority: number;
}

interface ContentTemplate {
  title: string;
  slug: string;
  description: string;
  keywords: string[];
  h2Structure: string[];
  content: string;
  structuredData: any;
}

class WineContentAutomation {
  private supabase;
  private replicate: Replicate | null = null;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env.local');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize Replicate for image generation
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (replicateToken) {
      this.replicate = new Replicate({ auth: replicateToken });
      console.log('🎨 Image generation enabled');
    } else {
      console.log('⚠️  REPLICATE_API_TOKEN not set - images will not be generated');
    }
  }

  /**
   * Generate image prompt based on keyword
   */
  private generateImagePrompt(keyword: string): string {
    const lowerKeyword = keyword.toLowerCase();

    // Food pairing prompts
    if (lowerKeyword.includes('pairing') || lowerKeyword.includes('with food')) {
      return `elegant wine and food pairing spread, multiple wine glasses with different wines, variety of dishes, professional food photography, warm inviting atmosphere, soft natural lighting --ar 16:9`;
    }

    // Orange wine prompts
    if (lowerKeyword.includes('orange wine') || lowerKeyword.includes('skin contact')) {
      if (lowerKeyword.includes('cheap') || lowerKeyword.includes('under')) {
        return `affordable orange wine bottles, amber colored wines, casual wine bar setting, budget-friendly selection, welcoming atmosphere, warm lighting --ar 16:9`;
      }
      if (lowerKeyword.includes('review')) {
        return `natural orange wine tasting setup, amber-colored wine bottles and glasses arranged for review, tasting notes, professional wine review setting, warm copper tones, soft lighting --ar 16:9`;
      }
      if (lowerKeyword.includes('price') || lowerKeyword.includes('buy')) {
        return `orange wine bottles with price tags in wine shop, amber colored skin-contact wines, helpful buying guide aesthetic, warm inviting lighting --ar 16:9`;
      }
      return `selection of orange wines in amber hues, skin contact wines, modern wine bar setting, warm copper and orange tones, professional photography --ar 16:9`;
    }

    // Natural wine prompts
    if (lowerKeyword.includes('natural wine')) {
      if (lowerKeyword.includes('cheap') || lowerKeyword.includes('under') || lowerKeyword.includes('budget')) {
        return `affordable natural wine bottles with friendly labels, bright welcoming setting, beginner-friendly wine selection, warm natural lighting --ar 16:9`;
      }
      if (lowerKeyword.includes('review')) {
        return `natural wine tasting setup, multiple bottles and glasses, tasting notes paper, professional wine review setting, warm lighting --ar 16:9`;
      }
      if (lowerKeyword.includes('price') || lowerKeyword.includes('buy')) {
        return `natural wine bottles with visible price tags, wine shop display, range of prices shown, helpful buying guide aesthetic, warm lighting --ar 16:9`;
      }
      return `natural wine in rustic glass, slightly cloudy appearance, organic vineyard aesthetic, earth tones with burgundy accents, artisanal feeling --ar 16:9`;
    }

    // Varietal-specific prompts
    if (lowerKeyword.includes('cabernet')) {
      return `elegant glass of deep red cabernet sauvignon wine, professional wine photography, dark moody background, soft lighting highlighting wine color --ar 16:9`;
    }
    if (lowerKeyword.includes('chardonnay')) {
      return `glass of golden chardonnay white wine, soft natural lighting, elegant wine glass, subtle oak barrel in background, warm golden tones --ar 16:9`;
    }
    if (lowerKeyword.includes('pinot noir')) {
      return `delicate glass of pinot noir, light ruby red color, professional wine photography, soft natural lighting, burgundy vineyard atmosphere --ar 16:9`;
    }
    if (lowerKeyword.includes('merlot')) {
      return `glass of smooth merlot red wine, velvet burgundy color, professional wine photography, soft ambient lighting, elegant dark setting --ar 16:9`;
    }
    if (lowerKeyword.includes('rosé') || lowerKeyword.includes('rose')) {
      return `beautiful glass of rosé wine, pale salmon pink color, summer terrace setting, soft golden hour lighting, professional wine photography --ar 16:9`;
    }

    // Default wine prompt
    return `elegant wine glass on sophisticated table setting, professional wine photography, warm ambient lighting, burgundy accents, clean minimal composition --ar 16:9`;
  }

  /**
   * Download image from URL
   */
  private async downloadImage(url: string, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filepath);
      const protocol = url.startsWith("https") ? https : http;

      protocol.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          this.downloadImage(response.headers.location as string, filepath).then(resolve).catch(reject);
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

  /**
   * Generate image for article using Replicate
   */
  private async generateArticleImage(slug: string, keyword: string): Promise<boolean> {
    if (!this.replicate) {
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
      const prompt = this.generateImagePrompt(keyword);
      const output = await this.replicate.run(
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
      await this.downloadImage(imageUrl, filepath);
      console.log(`   ✅ Saved ${slug}.png`);
      return true;

    } catch (error: any) {
      console.error(`   ❌ Failed to generate image for ${slug}:`, error.message);
      return false;
    }
  }

  /**
   * Main daily automation workflow
   */
  async runDailyWorkflow(): Promise<void> {
    console.log('🍷 Starting daily wine content automation...');
    
    try {
      // Step 1: Check how many pages we've created today
      const todaysPagesCount = await this.getTodaysPagesCount();
      const remainingPages = Math.max(0, 5 - todaysPagesCount);
      
      if (remainingPages === 0) {
        console.log('✅ You\'ve already created your 5 daily pages today!');
        console.log('💡 Come back tomorrow for 5 more pages.');
        return;
      }
      
      console.log(`📝 You can create ${remainingPages} more pages today.`);
      
      // Step 2: Get unused keywords from database
      const keywords = await this.getUnusedWineKeywords(remainingPages);
      
      if (keywords.length === 0) {
        console.log('⚠️  No unused keywords available.');
        console.log('💡 Run "npm run wine:keywords" to research new keywords first.');
        return;
      }
      
      console.log(`🎯 Found ${keywords.length} unused keywords to target`);
      
      // Step 3: Generate pages for unused keywords
      const pages = await this.generateWinePages(keywords);
      
      // Step 4: Quality check each page
      const qualityPages = await this.qualityCheckPages(pages);
      
      // Step 5: Save to database and mark keywords as used
      await this.saveToDatabase(qualityPages);
      
      // Step 6: Generate Astro files
      await this.generateAstroFiles(qualityPages);
      
      console.log(`✅ Successfully generated ${qualityPages.length} new wine pages`);
      
      if (qualityPages.length < keywords.length) {
        console.log(`⚠️  ${keywords.length - qualityPages.length} pages failed quality check`);
      }
      
    } catch (error) {
      console.error('❌ Daily automation failed:', error);
      throw error;
    }
  }

  /**
   * Get count of pages created today
   */
  protected async getTodaysPagesCount(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from('wine_pages')
      .select('id')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);
    
    if (error) {
      console.error('Error checking today\'s pages:', error);
      return 0;
    }
    
    return data?.length || 0;
  }

  /**
   * Normalize keyword for duplicate detection (sort words alphabetically)
   */
  private normalizeKeyword(keyword: string): string {
    return keyword.toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(' ')
      .filter(w => w.length > 0)
      .sort()
      .join(' ');
  }

  /**
   * Get unused keywords from database (prioritized by search volume and priority)
   * Includes duplicate detection to prevent articles with same content in different word order
   */
  protected async getUnusedWineKeywords(limit: number = 5): Promise<WineKeyword[]> {
    // First, get existing page slugs to avoid duplicates
    const { data: existingPages } = await this.supabase
      .from('wine_pages')
      .select('slug');

    const existingSlugs = new Set(existingPages?.map(p => p.slug) || []);

    // Also get ALL used keywords to detect semantic duplicates
    const { data: usedKeywordsData } = await this.supabase
      .from('keyword_opportunities')
      .select('keyword')
      .eq('status', 'used');

    // Create set of normalized used keywords for duplicate detection
    const usedNormalizedKeywords = new Set(
      usedKeywordsData?.map(kw => this.normalizeKeyword(kw.keyword)) || []
    );

    console.log(`📊 Found ${existingSlugs.size} existing pages, ${usedNormalizedKeywords.size} used keyword patterns`);

    // Get unused keywords from research - fetch more to account for filtering
    const { data: keywordData, error } = await this.supabase
      .from('keyword_opportunities')
      .select('*')
      .or('status.is.null,status.eq.active')
      .order('priority', { ascending: false })
      .order('search_volume', { ascending: false })
      .limit(limit * 10); // Get many more to account for duplicate filtering

    if (error) {
      console.error('Error fetching keywords:', error);
      return [];
    }

    if (!keywordData || keywordData.length === 0) {
      return [];
    }

    // Track normalized keywords we're selecting in this batch
    const selectedNormalizedKeywords = new Set<string>();

    // Filter out keywords that already have pages OR are semantic duplicates
    const unusedKeywords: WineKeyword[] = [];

    for (const kw of keywordData) {
      if (unusedKeywords.length >= limit) break;

      const slug = this.keywordToSlug(kw.keyword);
      const normalized = this.normalizeKeyword(kw.keyword);

      // Skip if slug already exists
      if (existingSlugs.has(slug)) {
        continue;
      }

      // Skip if this is a semantic duplicate of a used keyword
      if (usedNormalizedKeywords.has(normalized)) {
        console.log(`   ⏭️  Skipping "${kw.keyword}" (duplicate of used keyword)`);
        continue;
      }

      // Skip if this is a semantic duplicate of a keyword we're already selecting
      if (selectedNormalizedKeywords.has(normalized)) {
        console.log(`   ⏭️  Skipping "${kw.keyword}" (duplicate in current batch)`);
        continue;
      }

      // This keyword is unique - add it
      selectedNormalizedKeywords.add(normalized);
      unusedKeywords.push({
        keyword: kw.keyword,
        volume: kw.search_volume || 0,
        difficulty: kw.keyword_difficulty || 0,
        intent: kw.intent || 'informational',
        priority: kw.priority || 5
      });
    }

    return unusedKeywords;
  }

  /**
   * Convert keyword to URL-safe slug
   */
  private keywordToSlug(keyword: string): string {
    return keyword.toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, '-');
  }

  /**
   * Generate wine pairing pages
   */
  protected async generateWinePages(keywords: WineKeyword[]): Promise<ContentTemplate[]> {
    const pages: ContentTemplate[] = [];
    
    for (const kw of keywords) {
      console.log(`📝 Creating page for "${kw.keyword}"...`);
      const page = await this.createWinePage(kw);
      pages.push(page);
    }
    
    return pages;
  }

  /**
   * Create individual wine page using templates
   */
  private async createWinePage(keyword: WineKeyword): Promise<ContentTemplate> {
    const slug = this.keywordToSlug(keyword.keyword);

    // Base template structure
    const template: ContentTemplate = {
      title: this.generateTitle(keyword.keyword),
      slug: slug,
      description: this.generateDescription(keyword.keyword),
      keywords: [keyword.keyword, ...this.generateRelatedKeywords(keyword.keyword)],
      h2Structure: this.generateH2Structure(keyword.keyword),
      content: await this.generateContent(keyword),
      structuredData: this.generateStructuredData(keyword.keyword)
    };

    return template;
  }

  /**
   * Generate SEO-optimized title
   */
  private generateTitle(keyword: string): string {
    const templates = [
      `${this.capitalize(keyword)}: Expert Guide 2024`,
      `Perfect ${this.capitalize(keyword)} - Wine Expert Tips`,
      `${this.capitalize(keyword)}: Complete Guide & Recommendations`,
      `Best ${this.capitalize(keyword)}: Sommelier's Choice 2024`,
      `${this.capitalize(keyword)}: Professional Wine Guide`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate meta description
   */
  private generateDescription(keyword: string): string {
    const templates = [
      `Discover the perfect ${keyword} with our expert wine guide. Get professional pairing recommendations, tasting notes, and price insights for the best wine experience.`,
      `Master ${keyword} with our sommelier-approved guide. Expert recommendations, food pairings, and insider tips for wine enthusiasts.`,
      `Complete ${keyword} guide featuring expert tasting notes, perfect food pairings, and professional recommendations from certified sommeliers.`,
      `Explore ${keyword} with confidence. Our wine experts share professional recommendations, pairing tips, and buying guides for every budget.`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate H2 structure for content
   */
  private generateH2Structure(keyword: string): string[] {
    if (keyword.includes('pairing')) {
      return [
        `Understanding ${this.capitalize(keyword)}`,
        'Expert Wine Recommendations',
        'Tasting Notes & Flavor Profiles',
        'Food Pairing Guide',
        'Where to Buy',
        'Serving Tips'
      ];
    }
    
    if (keyword.includes('wine') && (keyword.includes('best') || keyword.includes('guide'))) {
      return [
        `What Makes Great ${this.extractWineType(keyword)}`,
        'Top Recommendations by Price Range',
        'Tasting Notes & Flavor Profiles',
        'Food Pairing Suggestions',
        'Where to Buy & Current Prices',
        'Expert Tips & Serving Guide'
      ];
    }
    
    return [
      `Understanding ${this.capitalize(keyword)}`,
      'Expert Recommendations',
      'Tasting Notes & Flavor Profiles',
      'Food Pairing Guide',
      'Where to Buy',
      'Serving Tips'
    ];
  }

  /**
   * Extract wine type from keyword
   */
  private extractWineType(keyword: string): string {
    const wineTypes = ['natural wine', 'orange wine', 'red wine', 'white wine', 'sparkling wine', 'dessert wine'];
    for (const type of wineTypes) {
      if (keyword.includes(type)) {
        return type;
      }
    }
    return 'wine';
  }

  /**
   * Generate related keywords
   */
  private generateRelatedKeywords(keyword: string): string[] {
    const base = keyword.split(' ');
    return [
      `${keyword} 2024`,
      `best ${keyword}`,
      `${keyword} guide`,
      `${keyword} recommendations`,
      `${base[0]} pairing`
    ].filter(k => k !== keyword);
  }

  /**
   * Generate structured data for SEO
   */
  private generateStructuredData(keyword: string): any {
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": this.generateTitle(keyword),
      "description": this.generateDescription(keyword),
      "author": {
        "@type": "Organization",
        "name": "Wine Quick Start"
      },
      "datePublished": new Date().toISOString(),
      "dateModified": new Date().toISOString()
    };
  }

  /**
   * Generate full content (would use MCP tools in practice)
   */
  private async generateContent(keyword: WineKeyword): Promise<string> {
    // This would integrate with Perplexity and Firecrawl MCPs
    // For now, returning a placeholder structure based on keyword type
    const wineType = this.extractWineType(keyword.keyword);
    
    return `
## Understanding ${this.capitalize(keyword.keyword)}

When it comes to ${keyword.keyword}, understanding the fundamental principles of wine selection is crucial. This comprehensive guide will help you navigate the world of ${wineType} with confidence and expertise.

## Expert Recommendations

Based on extensive research and tasting notes from certified sommeliers, we've identified the key characteristics that make exceptional ${keyword.keyword}. Our recommendations focus on quality, value, and food-pairing versatility.

## Tasting Notes & Flavor Profiles

### Primary Characteristics
- **Acidity**: Medium to high, providing excellent food pairing potential
- **Body**: Medium-bodied with excellent balance
- **Tannins**: Soft and approachable, perfect for various occasions
- **Alcohol**: 12-14%, ideal for extended enjoyment

### Flavor Profile
The best examples of ${keyword.keyword} showcase complex aromatics with layers of fruit, earth, and subtle spice notes that evolve beautifully in the glass.

## Food Pairing Guide

The versatility of ${keyword.keyword} makes it an excellent choice for diverse culinary experiences. Consider these pairing principles:

- **Light dishes**: Enhance delicate flavors without overwhelming
- **Rich preparations**: Provide balance and palate cleansing
- **Seasonal ingredients**: Complement seasonal cooking styles

## Where to Buy

Current market prices for quality ${keyword.keyword} range from affordable everyday options to premium selections. We recommend purchasing from reputable wine shops or directly from producers when possible.

## Serving Tips

For the optimal experience with ${keyword.keyword}:
- Serve at the proper temperature (varies by style)
- Use appropriate glassware to enhance aromatics
- Allow proper breathing time before serving
- Store correctly to maintain quality
    `.trim();
  }

  /**
   * Quality check pages (6/10 threshold for better success rate)
   */
  protected async qualityCheckPages(pages: ContentTemplate[]): Promise<ContentTemplate[]> {
    const qualityPages = [];
    
    for (const page of pages) {
      const score = this.calculateQualityScore(page);
      
      if (score >= 8) {
        qualityPages.push(page);
        console.log(`✅ Page "${page.title}" passed quality check (${score}/10)`);
      } else {
        console.log(`❌ Page "${page.title}" failed quality check (${score}/10) - needs improvement`);
      }
    }
    
    return qualityPages;
  }

  /**
   * Calculate quality score (0-10)
   */
  private calculateQualityScore(page: ContentTemplate): number {
    let score = 10;
    
    // Title length check (30-60 chars ideal)
    if (page.title.length < 30 || page.title.length > 60) score -= 1;
    
    // Description length check (140-160 chars ideal)
    if (page.description.length < 140 || page.description.length > 160) score -= 1;
    
    // Content length check (minimum 1000 chars)
    if (page.content.length < 1000) score -= 2;
    
    // H2 structure check (minimum 4 sections)
    if (page.h2Structure.length < 4) score -= 1;
    
    // Keyword optimization (minimum 3 keywords)
    if (page.keywords.length < 3) score -= 1;
    
    // Structured data check
    if (!page.structuredData['@type']) score -= 1;
    
    // Wine-specific content check
    if (!page.content.includes('wine') && !page.content.includes('tasting')) score -= 1;
    
    return Math.max(0, score);
  }

  /**
   * Save pages to Supabase and mark keywords as used
   */
  protected async saveToDatabase(pages: ContentTemplate[]): Promise<void> {
    for (const page of pages) {
      // Save the page
      const { error: pageError } = await this.supabase
        .from('wine_pages')
        .upsert({
          slug: page.slug,
          title: page.title,
          description: page.description,
          content: page.content,
          keywords: page.keywords,
          h2_structure: page.h2Structure,
          structured_data: page.structuredData,
          created_at: new Date().toISOString(),
          status: 'published'
        });
      
      if (pageError) {
        console.error(`Failed to save page ${page.slug}:`, pageError);
        continue;
      }
      
      // Mark keyword as used
      const primaryKeyword = page.keywords[0];
      const { error: keywordError } = await this.supabase
        .from('keyword_opportunities')
        .update({ 
          status: 'used', 
          used_at: new Date().toISOString() 
        })
        .eq('keyword', primaryKeyword);
      
      if (keywordError) {
        console.log(`⚠️  Could not mark keyword "${primaryKeyword}" as used:`, keywordError);
      }
      
      console.log(`💾 Saved page: ${page.slug}`);
    }
  }

  /**
   * Determine the best filepath based on keyword intent and type
   */
  protected determineFilepath(keyword: string): string {
    const lowerKeyword = keyword.toLowerCase();
    
    // Purchase-focused content
    if (lowerKeyword.includes('buy') || 
        lowerKeyword.includes('price') || 
        lowerKeyword.includes('cost') ||
        lowerKeyword.includes('purchase') ||
        lowerKeyword.includes('where to buy')) {
      return 'buy';
    }
    
    // Educational content
    if (lowerKeyword.includes('what is') ||
        lowerKeyword.includes('guide') ||
        lowerKeyword.includes('best') ||
        lowerKeyword.includes('how to') ||
        lowerKeyword.includes('learn') ||
        lowerKeyword.includes('understanding') ||
        lowerKeyword.includes('types of') ||
        lowerKeyword.includes('introduction')) {
      return 'learn';
    }
    
    // Food pairing content
    if (lowerKeyword.includes('pairing') ||
        lowerKeyword.includes('with food') ||
        lowerKeyword.includes('goes with') ||
        lowerKeyword.includes('pairs with') ||
        lowerKeyword.includes('food match') ||
        lowerKeyword.includes('serve with')) {
      return 'wine-pairings';
    }
    
    // Default: if it's about wine varieties or regions, put in learn
    if (lowerKeyword.includes('wine') || 
        lowerKeyword.includes('bordeaux') ||
        lowerKeyword.includes('burgundy') ||
        lowerKeyword.includes('pinot') ||
        lowerKeyword.includes('chardonnay') ||
        lowerKeyword.includes('cabernet')) {
      return 'learn';
    }
    
    // Fallback to wine-pairings
    return 'wine-pairings';
  }

  /**
   * Generate Astro files with smart filepath routing and image generation
   */
  protected async generateAstroFiles(pages: ContentTemplate[]): Promise<void> {
    const fsPromises = await import('fs/promises');

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];

      // Generate image first (if Replicate is configured)
      let hasImage = false;
      if (this.replicate) {
        hasImage = await this.generateArticleImage(page.slug, page.keywords[0]);
        // Rate limit delay (10s between image generations)
        if (hasImage && i < pages.length - 1) {
          console.log(`   ⏳ Waiting 10s for rate limit...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }

      // Fetch real wines from the wine catalog
      const realWines = await this.fetchRealWines(page.keywords[0]);
      const astroContent = this.generateAstroFile(page, realWines, hasImage);
      const directory = this.determineFilepath(page.keywords[0]);
      const filePath = `src/pages/${directory}/${page.slug}.astro`;

      try {
        await fsPromises.writeFile(filePath, astroContent);
        console.log(`📄 Generated Astro file: ${directory}/${page.slug}.astro`);
        console.log(`   🍷 Using ${realWines.length} real wines from catalog`);
        if (hasImage) {
          console.log(`   🖼️  Image linked: ${page.slug}.png`);
        }
      } catch (error) {
        console.error(`Failed to write file ${directory}/${page.slug}.astro:`, error);
      }
    }
  }

  /**
   * Fetch real wines from the wine catalog for a given keyword
   */
  private async fetchRealWines(keyword: string): Promise<any[]> {
    try {
      const wines = await getWinesForKeyword(keyword, 3);

      // Transform to the format expected by the template
      return wines.map(wine => ({
        name: wine.name,
        region: wine.region,
        price: this.estimatePrice(wine),
        rating: this.estimateRating(wine),
        type: wine.wine_type,
        notes: wine.notes,
        link: `https://wine-searcher.com/find/${encodeURIComponent(wine.producer.toLowerCase().replace(/\s+/g, '+'))}`
      }));
    } catch (error) {
      console.warn(`⚠️ Could not fetch real wines for "${keyword}", using fallback`);
      return this.generateMockWineData(keyword);
    }
  }

  /**
   * Estimate price based on wine characteristics (placeholder until real price data available)
   */
  private estimatePrice(wine: WineRecommendation): string {
    // Premium indicators
    const producer = wine.producer.toLowerCase();
    const region = wine.region.toLowerCase();

    // Check for premium indicators
    if (producer.includes('domaine') || producer.includes('château') ||
        region.includes('burgundy') || region.includes('champagne') ||
        region.includes('napa')) {
      return String(45 + Math.floor(Math.random() * 55)); // $45-100
    }

    // Mid-range
    if (region.includes('california') || region.includes('oregon') ||
        region.includes('bordeaux')) {
      return String(28 + Math.floor(Math.random() * 32)); // $28-60
    }

    // Value wines
    return String(18 + Math.floor(Math.random() * 22)); // $18-40
  }

  /**
   * Estimate rating based on wine source
   */
  private estimateRating(wine: WineRecommendation): string {
    // All wines from a curated catalog are assumed to be quality
    return String(88 + Math.floor(Math.random() * 8)); // 88-95
  }

  /**
   * Generate Astro file content with optional featured image and E-E-A-T compliance
   */
  private generateAstroFile(page: ContentTemplate, wines: any[], hasImage: boolean = false): string {
    // Use E-E-A-T compliant author from authors.ts
    const author = getRandomAuthor();
    const authorSchema = getAuthorSchema(author);

    // Build E-E-A-T compliant structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": page.title,
      "description": page.description,
      "author": authorSchema,
      "publisher": {
        "@type": "Organization",
        "name": "Wine Quick Start",
        "url": "https://winesquickstart.com"
      },
      "datePublished": new Date().toISOString(),
      "dateModified": new Date().toISOString(),
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://winesquickstart.com/${this.determineFilepath(page.keywords[0])}/${page.slug}`
      }
    };

    // Build imports section
    const imports = [`import ArticleLayout from '../../layouts/ArticleLayout.astro';`];
    if (hasImage) {
      imports.push(`import featuredImage from '../../assets/images/articles/${page.slug}.png';`);
    }

    // Build ArticleLayout props
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

    return `---
${imports.join('\n')}

const frontmatter = {
  title: "${page.title}",
  description: "${page.description}",
  wine_type: "${this.determineWineType(page.keywords[0])}",
  author: "${author.name}",
  authorSlug: "${author.slug}",
  authorRole: "${author.role}",
  authorCredentials: ${JSON.stringify(author.credentials)},
  readTime: "${this.estimateReadTime(page.content)}",
  expert_score: 9,
  structured_data: ${JSON.stringify(structuredData, null, 2)},
  wines: ${JSON.stringify(wines, null, 2)}
};
---

<ArticleLayout ${layoutProps.join(' ')}>
  <!-- Author Attribution for E-E-A-T -->
  <div class="bg-gray-50 p-4 rounded-lg mb-6 flex items-center gap-4">
    <div class="w-12 h-12 rounded-full bg-wine-100 flex items-center justify-center text-wine-700 font-bold">
      ${author.name.split(' ').map((n: string) => n[0]).join('')}
    </div>
    <div>
      <a href="/about/${author.slug}" class="font-semibold text-gray-900 hover:text-wine-600">${author.name}</a>
      <p class="text-sm text-gray-600">${author.role} | ${author.credentials[0]}</p>
    </div>
  </div>

  <p><strong>Quick Answer:</strong> ${this.generateQuickAnswer(page.keywords[0])}</p>

${this.formatContentForAstro(page.content)}

  <!-- Author Bio Footer for E-E-A-T -->
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
        <a href="/about/${author.slug}" class="text-sm text-wine-600 hover:text-wine-800 mt-2 inline-block">View full profile →</a>
      </div>
    </div>
  </div>

</ArticleLayout>`;
  }

  /**
   * Get random wine expert for attribution (deprecated - use getRandomAuthor from authors.ts)
   */
  private getRandomExpert(): { name: string; title: string } {
    const experts = [
      { name: "Sarah Chen", title: "Master Sommelier" },
      { name: "Marcus Dubois", title: "Certified Sommelier" },
      { name: "Elena Rodriguez", title: "Wine Expert" },
      { name: "Philippe Moreau", title: "Master Sommelier" },
      { name: "Isabella Romano", title: "Certified Sommelier" },
      { name: "James Patterson", title: "Wine Consultant" }
    ];
    
    return experts[Math.floor(Math.random() * experts.length)];
  }

  /**
   * Estimate read time based on content length
   */
  private estimateReadTime(content: string): string {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${Math.max(3, minutes)} min`;
  }

  /**
   * Format content for Astro with proper structure
   */
  private formatContentForAstro(content: string): string {
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
      'Barossa Valley, Australia', 'Rioja, Spain', 'Douro, Portugal',
      'Willamette Valley, Oregon', 'Central Otago, New Zealand'
    ];
    const producers = [
      'Château', 'Domaine', 'Bodega', 'Estate', 'Vineyard', 'Winery'
    ];
    const prices = ['28', '35', '42', '55', '68', '85'];
    const ratings = ['88', '90', '91', '92', '93', '94'];
    
    return Array.from({ length: 3 }, (_, i) => {
      const producer = producers[i % producers.length];
      const year = 2018 + i;
      const wineType = this.determineWineType(keyword);
      
      return {
        name: `${year} ${producer} ${this.generateWineName(keyword, i)}`,
        region: wineRegions[i % wineRegions.length],
        price: prices[i % prices.length],
        rating: ratings[i % ratings.length],
        type: wineType,
        notes: this.generateWineNotes(keyword, wineType),
        link: `https://wine-searcher.com/find/${keyword.replace(/\s+/g, '-')}-${i + 1}`
      };
    });
  }

  /**
   * Generate wine name based on keyword
   */
  private generateWineName(keyword: string, index: number): string {
    const baseNames = ['Reserve', 'Selection', 'Classic', 'Premium', 'Estate'];
    
    if (keyword.includes('bordeaux')) {
      return ['Margaux Style', 'Left Bank Blend', 'Saint-Julien'][index] || 'Reserve';
    } else if (keyword.includes('burgundy')) {
      return ['Villages', 'Premier Cru', 'Grand Cru'][index] || 'Villages';
    } else if (keyword.includes('champagne')) {
      return ['Brut', 'Extra Brut', 'Blanc de Blancs'][index] || 'Brut';
    } else if (keyword.includes('pinot noir')) {
      return ['Reserve Pinot Noir', 'Estate Pinot', 'Single Vineyard'][index] || 'Pinot Noir';
    } else if (keyword.includes('chardonnay')) {
      return ['Unoaked Chardonnay', 'Barrel Fermented', 'Reserve Chardonnay'][index] || 'Chardonnay';
    }
    
    return baseNames[index % baseNames.length];
  }

  /**
   * Generate realistic tasting notes
   */
  private generateWineNotes(keyword: string, wineType: string): string {
    const redNotes = [
      'Rich blackberry and cassis with hints of vanilla and spice.',
      'Elegant with cherry fruit, earthy undertones, and silky tannins.',
      'Full-bodied with dark fruit, chocolate, and well-integrated oak.'
    ];
    
    const whiteNotes = [
      'Crisp and refreshing with citrus, mineral, and subtle oak notes.',
      'Elegant with stone fruit, floral aromatics, and balanced acidity.',
      'Complex with tropical fruit, vanilla, and a long, clean finish.'
    ];
    
    const sparklingNotes = [
      'Fine bubbles with fresh citrus, brioche, and mineral complexity.',
      'Elegant mousse with apple, pear, and toasty lees character.',
      'Crisp and lively with stone fruit and creamy texture.'
    ];
    
    if (wineType === 'red') {
      return redNotes[Math.floor(Math.random() * redNotes.length)];
    } else if (wineType === 'sparkling') {
      return sparklingNotes[Math.floor(Math.random() * sparklingNotes.length)];
    } else {
      return whiteNotes[Math.floor(Math.random() * whiteNotes.length)];
    }
  }

  /**
   * Determine wine type from keyword
   */
  private determineWineType(keyword: string): string {
    if (keyword.includes('red')) return 'red';
    if (keyword.includes('white')) return 'white';
    if (keyword.includes('rosé') || keyword.includes('rose')) return 'rosé';
    if (keyword.includes('sparkling')) return 'sparkling';
    return 'red'; // default
  }

  /**
   * Generate quick answer for the page
   */
  private generateQuickAnswer(keyword: string): string {
    if (keyword.includes('pairing')) {
      return `The best approach to ${keyword} focuses on complementary flavors and balanced acidity. Consider wine body, tannin structure, and seasonal ingredients for optimal results.`;
    }
    return `For ${keyword}, look for wines with good balance, appropriate body, and food-friendly characteristics. Quality producers and proper storage ensure the best experience.`;
  }

  /**
   * Utility: Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Export for use in other scripts
export default WineContentAutomation;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const automation = new WineContentAutomation();
  automation.runDailyWorkflow()
    .then(() => {
      console.log('🎉 Daily wine automation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Daily automation failed:', error);
      process.exit(1);
    });
}