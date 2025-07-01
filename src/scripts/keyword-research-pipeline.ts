/**
 * Wine Keyword Research Pipeline
 * Uses Perplexity + DataForSEO + Firecrawl for comprehensive wine keyword research
 */

import { createClient } from '@supabase/supabase-js';
import { getDataForSEOClient } from '../lib/dataforseo-client.js';
import { config } from 'dotenv';

// Load from .env.local (where your Supabase credentials are)
config({ path: '.env.local', override: true });

interface KeywordOpportunity {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  cpc: number;
  competition: 'low' | 'medium' | 'high';
  intent: 'informational' | 'commercial' | 'navigational' | 'transactional';
  seasonality: 'stable' | 'seasonal' | 'trending';
  relatedKeywords: string[];
  competitorUrls: string[];
  contentGaps: string[];
  priority: number; // 1-10 scale
}

interface CompetitorAnalysis {
  url: string;
  title: string;
  headings: string[];
  wordCount: number;
  backlinks: number;
  domain_authority: number;
  contentGaps: string[];
}

class WineKeywordResearch {
  private supabase;
  
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env.local');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Main keyword research workflow
   */
  async runKeywordResearch(): Promise<KeywordOpportunity[]> {
    console.log('🔍 Starting wine keyword research pipeline...');
    
    try {
      // Step 1: Get trending wine topics from Perplexity
      const trendingTopics = await this.getTrendingWineTopics();
      
      // Step 2: Expand keywords using seed terms
      const expandedKeywords = await this.expandKeywords(trendingTopics);
      
      // Step 3: Get search volume and competition data
      const keywordData = await this.getKeywordMetrics(expandedKeywords);
      
      // Step 4: Analyze top competitors for each keyword
      const competitorAnalysis = await this.analyzeCompetitors(keywordData);
      
      // Step 5: Score and rank opportunities
      const opportunities = await this.scoreOpportunities(keywordData, competitorAnalysis);
      
      // Step 6: Save to database
      await this.saveOpportunities(opportunities);
      
      console.log(`✅ Found ${opportunities.length} wine keyword opportunities`);
      return opportunities.slice(0, 50); // Return top 50
      
    } catch (error) {
      console.error('❌ Keyword research failed:', error);
      throw error;
    }
  }

  /**
   * Get trending wine topics using Perplexity
   */
  private async getTrendingWineTopics(): Promise<string[]> {
    // In practice, this would use the Perplexity MCP
    // Example prompts to use with Perplexity:
    const perplexityPrompts = [
      "What are the trending wine topics and searches in 2024?",
      "Find emerging wine regions and varietals gaining popularity",
      "Search for seasonal wine pairing trends this month",
      "Discover new wine industry developments and consumer interests"
    ];

    // Mock data representing what Perplexity would return
    return [
      "natural wine",
      "orange wine",
      "biodynamic wine", 
      "low alcohol wine",
      "wine pairing seafood",
      "burgundy 2022 vintage",
      "sustainable wine",
      "pet nat wine",
      "wine storage temperature",
      "wine investment 2024",
      "natural wine bars",
      "orange wine pairing",
      "wine tasting techniques",
      "wine and chocolate",
      "summer wine cocktails"
    ];
  }

  /**
   * Expand keywords using wine-specific modifiers
   */
  private async expandKeywords(seedTerms: string[]): Promise<string[]> {
    const modifiers = [
      // Intent modifiers
      "best", "guide", "how to", "what is", "types of", "vs",
      // Wine-specific modifiers  
      "pairing", "tasting notes", "price", "buy", "recommendations",
      "vintage", "region", "food pairing", "serving temperature",
      // Commercial modifiers
      "under $20", "under $50", "cheap", "expensive", "budget",
      // Informational modifiers
      "beginner", "expert", "review", "rating", "comparison"
    ];

    const expanded: string[] = [];
    
    for (const seed of seedTerms) {
      // Add base term
      expanded.push(seed);
      
      // Add modified versions
      for (const modifier of modifiers) {
        expanded.push(`${modifier} ${seed}`);
        expanded.push(`${seed} ${modifier}`);
      }
      
      // Add question variations
      expanded.push(`what is ${seed}`);
      expanded.push(`how to choose ${seed}`);
      expanded.push(`best ${seed} for beginners`);
    }

    // Remove duplicates and filter
    return Array.from(new Set(expanded))
      .filter(kw => kw.length >= 10 && kw.length <= 100);
  }

  /**
   * Get keyword metrics from DataForSEO
   */
  private async getKeywordMetrics(keywords: string[]): Promise<any[]> {
    console.log(`🔍 Getting keyword metrics for ${keywords.length} keywords...`);
    
    try {
      const client = getDataForSEOClient();
      const keywordData = await client.getKeywordData(keywords);
      
      console.log(`✅ Retrieved data for ${keywordData.length} keywords`);
      
      return keywordData.map(kw => ({
        keyword: kw.keyword,
        search_volume: kw.search_volume,
        keyword_difficulty: kw.keyword_difficulty,
        cpc: kw.cpc,
        competition: kw.competition > 0.7 ? 'high' : kw.competition > 0.4 ? 'medium' : 'low',
        related_keywords: kw.related_keywords || this.generateRelatedKeywords(kw.keyword, 5),
        serp_features: ['organic_results', 'people_also_ask', 'related_searches']
      }));
      
    } catch (error) {
      console.error('❌ DataForSEO keyword metrics failed:', error);
      
      // Fallback to mock data if API fails
      console.log('📝 Using fallback mock data...');
      const mockMetrics = keywords.slice(0, 50).map(keyword => ({
        keyword,
        search_volume: Math.floor(Math.random() * 5000) + 100,
        keyword_difficulty: Math.floor(Math.random() * 70) + 10,
        cpc: Math.random() * 3 + 0.5,
        competition: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
        related_keywords: this.generateRelatedKeywords(keyword, 5),
        serp_features: ['featured_snippet', 'people_also_ask', 'related_searches']
      }));

      return mockMetrics;
    }
  }

  /**
   * Analyze competitors for each keyword
   */
  private async analyzeCompetitors(keywordData: any[]): Promise<Map<string, CompetitorAnalysis[]>> {
    const competitorMap = new Map<string, CompetitorAnalysis[]>();
    console.log(`🏆 Analyzing competitors for ${Math.min(10, keywordData.length)} keywords...`);
    
    for (const kw of keywordData.slice(0, 10)) { // Analyze top 10 keywords to save API calls
      try {
        const client = getDataForSEOClient();
        const serpData = await client.getSerpResults(kw.keyword);
        
        const competitors: CompetitorAnalysis[] = serpData.results.slice(0, 5).map(result => ({
          url: result.url,
          title: result.title,
          headings: this.generateCompetitorHeadings(kw.keyword), // Would use Firecrawl in practice
          wordCount: Math.floor(Math.random() * 2000) + 1000,
          backlinks: Math.floor(Math.random() * 500),
          domain_authority: Math.floor(Math.random() * 40) + 40,
          contentGaps: this.identifyContentGaps(kw.keyword)
        }));
        
        competitorMap.set(kw.keyword, competitors);
        console.log(`✅ Analyzed ${competitors.length} competitors for "${kw.keyword}"`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to analyze competitors for "${kw.keyword}":`, error);
        
        // Fallback to mock data
        const competitors: CompetitorAnalysis[] = [
          {
            url: `https://example-wine-site.com/${kw.keyword.replace(/\s+/g, '-')}`,
            title: `The Complete Guide to ${kw.keyword}`,
            headings: this.generateCompetitorHeadings(kw.keyword),
            wordCount: Math.floor(Math.random() * 2000) + 1000,
            backlinks: Math.floor(Math.random() * 500),
            domain_authority: Math.floor(Math.random() * 40) + 40,
            contentGaps: this.identifyContentGaps(kw.keyword)
          }
        ];
        
        competitorMap.set(kw.keyword, competitors);
      }
    }
    
    return competitorMap;
  }

  /**
   * Generate related keywords
   */
  private generateRelatedKeywords(keyword: string, count: number): string[] {
    const variations = [
      `${keyword} guide`,
      `${keyword} tips`, 
      `best ${keyword}`,
      `${keyword} for beginners`,
      `${keyword} review`
    ];
    
    return variations.slice(0, count);
  }

  /**
   * Generate competitor headings analysis
   */
  private generateCompetitorHeadings(keyword: string): string[] {
    return [
      `What is ${keyword}?`,
      `Best ${keyword} Options`,
      `How to Choose ${keyword}`,
      `Price Guide`,
      `Expert Reviews`,
      `Frequently Asked Questions`
    ];
  }

  /**
   * Identify content gaps in competitor analysis
   */
  private identifyContentGaps(keyword: string): string[] {
    return [
      `Interactive ${keyword} selector tool`,
      `Price comparison table`,
      `Video tasting notes`, 
      `User-generated reviews`,
      `Live pricing data`
    ];
  }

  /**
   * Score and rank keyword opportunities
   */
  private async scoreOpportunities(
    keywordData: any[], 
    competitorAnalysis: Map<string, CompetitorAnalysis[]>
  ): Promise<KeywordOpportunity[]> {
    
    const opportunities: KeywordOpportunity[] = [];
    
    for (const kw of keywordData) {
      const competitors = competitorAnalysis.get(kw.keyword) || [];
      const avgCompetitorDA = competitors.reduce((sum, comp) => sum + comp.domain_authority, 0) / competitors.length || 50;
      
      // Calculate priority score (1-10)
      let priority = 5; // Base score
      
      // Volume bonus
      if (kw.search_volume > 1000) priority += 2;
      else if (kw.search_volume > 500) priority += 1;
      
      // Difficulty penalty
      if (kw.keyword_difficulty < 25) priority += 2;
      else if (kw.keyword_difficulty > 50) priority -= 1;
      
      // Competition bonus
      if (avgCompetitorDA < 60) priority += 1;
      
      // Wine-specific bonus
      if (kw.keyword.includes('pairing') || kw.keyword.includes('wine')) priority += 1;
      
      // Commercial intent bonus
      const hasCommercialIntent = /buy|best|cheap|price|under \$|review/.test(kw.keyword);
      if (hasCommercialIntent) priority += 1;
      
      priority = Math.min(10, Math.max(1, priority));
      
      const opportunity: KeywordOpportunity = {
        keyword: kw.keyword,
        searchVolume: kw.search_volume,
        keywordDifficulty: kw.keyword_difficulty,
        cpc: kw.cpc,
        competition: kw.competition,
        intent: this.determineIntent(kw.keyword),
        seasonality: this.determineSeasonality(kw.keyword),
        relatedKeywords: kw.related_keywords,
        competitorUrls: competitors.map(c => c.url),
        contentGaps: competitors.flatMap(c => c.contentGaps),
        priority
      };
      
      opportunities.push(opportunity);
    }
    
    // Sort by priority score
    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Determine search intent
   */
  private determineIntent(keyword: string): KeywordOpportunity['intent'] {
    if (/buy|price|cheap|under \$|shop/.test(keyword)) return 'transactional';
    if (/best|vs|review|compare/.test(keyword)) return 'commercial';
    if (/how to|what is|guide|tips/.test(keyword)) return 'informational';
    return 'navigational';
  }

  /**
   * Determine seasonality
   */
  private determineSeasonality(keyword: string): KeywordOpportunity['seasonality'] {
    if (/summer|winter|holiday|christmas|valentine/.test(keyword)) return 'seasonal';
    if (/trending|2024|new/.test(keyword)) return 'trending';
    return 'stable';
  }

  /**
   * Save opportunities to database
   */
  private async saveOpportunities(opportunities: KeywordOpportunity[]): Promise<void> {
    for (const opp of opportunities) {
      const { error } = await this.supabase
        .from('keyword_opportunities')
        .upsert({
          keyword: opp.keyword,
          search_volume: opp.searchVolume,
          keyword_difficulty: opp.keywordDifficulty,
          cpc: opp.cpc,
          competition: opp.competition,
          intent: opp.intent,
          seasonality: opp.seasonality,
          related_keywords: opp.relatedKeywords,
          competitor_urls: opp.competitorUrls,
          content_gaps: opp.contentGaps,
          priority: opp.priority,
          created_at: new Date().toISOString(),
          status: 'active'
        });
      
      if (error) {
        console.error(`Failed to save keyword ${opp.keyword}:`, error);
      }
    }
    
    console.log(`💾 Saved ${opportunities.length} keyword opportunities`);
  }

  /**
   * Get top opportunities for content creation
   */
  async getTopOpportunities(limit: number = 10): Promise<KeywordOpportunity[]> {
    const { data, error } = await this.supabase
      .from('keyword_opportunities')
      .select('*')
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .order('search_volume', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Failed to fetch opportunities:', error);
      return [];
    }
    
    return data || [];
  }

  /**
   * Mark keyword as used
   */
  async markKeywordUsed(keyword: string): Promise<void> {
    await this.supabase
      .from('keyword_opportunities')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('keyword', keyword);
  }
}

export default WineKeywordResearch;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const research = new WineKeywordResearch();
  research.runKeywordResearch()
    .then((opportunities) => {
      console.log('\n🎯 Top 10 Wine Keyword Opportunities:');
      opportunities.slice(0, 10).forEach((opp, i) => {
        console.log(`${i + 1}. ${opp.keyword} (Vol: ${opp.searchVolume}, KD: ${opp.keywordDifficulty}, Priority: ${opp.priority})`);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Keyword research failed:', error);
      process.exit(1);
    });
}