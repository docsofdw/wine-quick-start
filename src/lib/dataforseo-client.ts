/**
 * DataForSEO API Client
 * Direct integration for keyword research and SERP analysis
 */

import dotenv from 'dotenv';
dotenv.config();

interface KeywordData {
  keyword: string;
  search_volume: number;
  keyword_difficulty: number;
  cpc: number;
  competition: number;
  monthly_searches: any[];
  related_keywords?: string[];
}

interface SerpData {
  keyword: string;
  results: {
    title: string;
    url: string;
    description: string;
    position: number;
  }[];
}

export class DataForSEOClient {
  private baseUrl = 'https://api.dataforseo.com/v3';
  private auth: string;

  constructor() {
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;
    
    if (!login || !password) {
      throw new Error('DataForSEO credentials not found. Please set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in .env');
    }
    
    this.auth = Buffer.from(`${login}:${password}`).toString('base64');
  }

  /**
   * Get keyword search volume and difficulty data
   */
  async getKeywordData(keywords: string[], location: string = 'United States'): Promise<KeywordData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/keywords_data/google/search_volume/live`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          keywords: keywords.slice(0, 100), // API limit
          location_name: location,
          language_name: 'English',
          include_serp_info: true,
          include_clickstream_data: true
        }])
      });

      if (!response.ok) {
        throw new Error(`DataForSEO API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status_code !== 20000) {
        throw new Error(`DataForSEO API error: ${data.status_message}`);
      }

      return data.tasks[0].result.map((item: any) => ({
        keyword: item.keyword,
        search_volume: item.search_volume || 0,
        keyword_difficulty: item.keyword_difficulty || 0,
        cpc: item.cpc || 0,
        competition: item.competition || 0,
        monthly_searches: item.monthly_searches || [],
        related_keywords: item.related_keywords?.slice(0, 5) || []
      }));

    } catch (error) {
      console.error('DataForSEO keyword data error:', error);
      return [];
    }
  }

  /**
   * Get SERP results for competitor analysis
   */
  async getSerpResults(keyword: string, location: string = 'United States'): Promise<SerpData> {
    try {
      const response = await fetch(`${this.baseUrl}/serp/google/organic/live/regular`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          keyword: keyword,
          location_name: location,
          language_name: 'English',
          device: 'desktop',
          os: 'windows',
          depth: 20
        }])
      });

      if (!response.ok) {
        throw new Error(`DataForSEO SERP API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status_code !== 20000) {
        throw new Error(`DataForSEO SERP API error: ${data.status_message}`);
      }

      const results = data.tasks[0].result[0].items
        .filter((item: any) => item.type === 'organic')
        .map((item: any) => ({
          title: item.title,
          url: item.url,
          description: item.description,
          position: item.rank_group
        }));

      return {
        keyword,
        results: results.slice(0, 10) // Top 10 results
      };

    } catch (error) {
      console.error('DataForSEO SERP error:', error);
      return { keyword, results: [] };
    }
  }

  /**
   * Get keyword suggestions
   */
  async getKeywordSuggestions(seed: string, location: string = 'United States'): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/keywords_data/google/keyword_suggestions/live`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          keyword: seed,
          location_name: location,
          language_name: 'English',
          limit: 50
        }])
      });

      if (!response.ok) {
        throw new Error(`DataForSEO suggestions API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status_code !== 20000) {
        throw new Error(`DataForSEO suggestions API error: ${data.status_message}`);
      }

      return data.tasks[0].result
        .map((item: any) => item.keyword)
        .filter((kw: string) => kw.length > 5 && kw.length < 100);

    } catch (error) {
      console.error('DataForSEO suggestions error:', error);
      return [];
    }
  }

  /**
   * Batch keyword research for wine topics
   */
  async batchWineKeywordResearch(seedKeywords: string[]): Promise<KeywordData[]> {
    const allKeywords: string[] = [];
    
    // Get suggestions for each seed
    for (const seed of seedKeywords) {
      const suggestions = await this.getKeywordSuggestions(seed);
      allKeywords.push(...suggestions);
      
      // Add modifiers for wine-specific searches
      const wineModifiers = [
        `${seed} pairing`,
        `${seed} food`,
        `${seed} guide`,
        `${seed} price`,
        `${seed} review`,
        `best ${seed}`,
        `${seed} under $20`,
        `${seed} under $50`
      ];
      
      allKeywords.push(...wineModifiers);
    }

    // Remove duplicates
    const uniqueKeywords = [...new Set(allKeywords)];
    
    // Get keyword data in batches
    const results: KeywordData[] = [];
    const batchSize = 100;
    
    for (let i = 0; i < uniqueKeywords.length; i += batchSize) {
      const batch = uniqueKeywords.slice(i, i + batchSize);
      const batchData = await this.getKeywordData(batch);
      results.push(...batchData);
      
      // Rate limiting - wait 1 second between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results
      .filter(kw => kw.search_volume > 50) // Minimum volume
      .sort((a, b) => b.search_volume - a.search_volume);
  }

  /**
   * Get account info and remaining credits
   */
  async getAccountInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${this.auth}`
        }
      });

      if (!response.ok) {
        throw new Error(`DataForSEO account API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('DataForSEO account info error:', error);
      return null;
    }
  }
}

// Singleton instance
let dataForSEOClient: DataForSEOClient | null = null;

export function getDataForSEOClient(): DataForSEOClient {
  if (!dataForSEOClient) {
    dataForSEOClient = new DataForSEOClient();
  }
  return dataForSEOClient;
}

export default DataForSEOClient;