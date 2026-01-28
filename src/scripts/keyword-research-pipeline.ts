/**
 * Wine Keyword Research Pipeline (FREE VERSION)
 * Uses Google Autocomplete + intelligent expansion (no paid APIs!)
 *
 * Usage:
 *   npx tsx src/scripts/keyword-research-pipeline.ts [options]
 *
 * Options:
 *   --limit=N       Limit results saved to database (default: 100)
 *   --dry-run       Preview without saving to database
 *   --seeds=X,Y,Z   Add custom seed keywords
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import {
  runFreeKeywordResearch,
  getGoogleAutocompleteSuggestions,
  expandWithModifiers,
  processKeywords,
  calculatePriority,
  estimateSearchVolume,
  estimateDifficulty,
  determineIntent,
  HIGH_VOLUME_WINE_SEEDS,
  type KeywordWithMetrics,
} from '../lib/free-keyword-tools.js';

// Load from .env.local
config({ path: '.env.local', override: true });

// Parse CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;
const seedsArg = args.find(a => a.startsWith('--seeds='));
const customSeeds = seedsArg ? seedsArg.split('=')[1].split(',') : [];

interface KeywordOpportunity {
  keyword: string;
  search_volume: number;
  keyword_difficulty: number;
  cpc: number;
  competition: 'low' | 'medium' | 'high';
  intent: 'informational' | 'commercial' | 'navigational' | 'transactional';
  seasonality: 'stable' | 'seasonal' | 'trending';
  priority: number;
  status: 'active' | 'used';
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
   * Main keyword research workflow (FREE - no paid APIs)
   */
  async runKeywordResearch(): Promise<KeywordOpportunity[]> {
    console.log('🍷 Wine Keyword Research Pipeline (FREE VERSION)\n');
    console.log('═══════════════════════════════════════════════\n');

    try {
      // Step 1: Run free keyword research
      const keywords = await runFreeKeywordResearch(customSeeds);

      // Step 2: Convert to database format
      const opportunities = this.convertToOpportunities(keywords);

      // Step 3: Filter and sort
      const filtered = opportunities
        .filter(o => o.priority >= 5) // Only save priority 5+
        .slice(0, limit);

      console.log(`\n📊 Found ${filtered.length} high-priority opportunities\n`);

      // Step 4: Save to database (unless dry run)
      if (!isDryRun) {
        await this.saveOpportunities(filtered);
      } else {
        console.log('🔍 DRY RUN - Not saving to database\n');
      }

      return filtered;

    } catch (error) {
      console.error('❌ Keyword research failed:', error);
      throw error;
    }
  }

  /**
   * Convert processed keywords to database format
   */
  private convertToOpportunities(keywords: KeywordWithMetrics[]): KeywordOpportunity[] {
    return keywords.map(kw => ({
      keyword: kw.keyword,
      search_volume: this.volumeToNumber(kw.estimatedVolume),
      keyword_difficulty: this.difficultyToNumber(kw.estimatedDifficulty),
      cpc: this.estimateCPC(kw.intent),
      competition: this.difficultyToCompetition(kw.estimatedDifficulty),
      intent: kw.intent,
      seasonality: this.detectSeasonality(kw.keyword),
      priority: kw.priority,
      status: 'active' as const,
    }));
  }

  /**
   * Convert volume estimate to numeric value
   */
  private volumeToNumber(volume: 'high' | 'medium' | 'low'): number {
    const map = { high: 2000, medium: 500, low: 100 };
    return map[volume] || 500;
  }

  /**
   * Convert difficulty to numeric value
   */
  private difficultyToNumber(difficulty: 'easy' | 'medium' | 'hard'): number {
    const map = { easy: 20, medium: 45, hard: 70 };
    return map[difficulty] || 45;
  }

  /**
   * Convert difficulty to competition level
   */
  private difficultyToCompetition(difficulty: 'easy' | 'medium' | 'hard'): 'low' | 'medium' | 'high' {
    const map = { easy: 'low', medium: 'medium', hard: 'high' } as const;
    return map[difficulty] || 'medium';
  }

  /**
   * Estimate CPC based on intent
   */
  private estimateCPC(intent: string): number {
    const map: Record<string, number> = {
      transactional: 2.5,
      commercial: 1.5,
      informational: 0.5,
      navigational: 0.3,
    };
    return map[intent] || 0.5;
  }

  /**
   * Detect if keyword is seasonal
   */
  private detectSeasonality(keyword: string): 'stable' | 'seasonal' | 'trending' {
    const kw = keyword.toLowerCase();

    // Seasonal keywords
    if (/thanksgiving|christmas|holiday|valentine|summer|winter|fall|spring|new year/.test(kw)) {
      return 'seasonal';
    }

    // Trending keywords
    if (/2024|2025|trending|new|latest/.test(kw)) {
      return 'trending';
    }

    return 'stable';
  }

  /**
   * Save opportunities to database
   */
  private async saveOpportunities(opportunities: KeywordOpportunity[]): Promise<void> {
    console.log('💾 Saving to database...\n');

    let saved = 0;
    let skipped = 0;
    let failed = 0;

    for (const opp of opportunities) {
      try {
        // Check if keyword already exists
        const { data: existing } = await this.supabase
          .from('keyword_opportunities')
          .select('keyword, status')
          .eq('keyword', opp.keyword)
          .single();

        if (existing) {
          // Update priority if existing is active
          if (existing.status === 'active') {
            await this.supabase
              .from('keyword_opportunities')
              .update({ priority: opp.priority })
              .eq('keyword', opp.keyword);
          }
          skipped++;
          continue;
        }

        // Insert new keyword
        const { error } = await this.supabase
          .from('keyword_opportunities')
          .insert({
            keyword: opp.keyword,
            search_volume: opp.search_volume,
            keyword_difficulty: opp.keyword_difficulty,
            cpc: opp.cpc,
            competition: opp.competition,
            intent: opp.intent,
            seasonality: opp.seasonality,
            priority: opp.priority,
            status: 'active',
            created_at: new Date().toISOString(),
          });

        if (error) {
          failed++;
        } else {
          saved++;
        }
      } catch (err) {
        failed++;
      }
    }

    console.log('═══════════════════════════════════════════════');
    console.log('📋 SAVE SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log(`✅ New keywords saved: ${saved}`);
    console.log(`⏭️  Already existed: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total processed: ${opportunities.length}\n`);
  }

  /**
   * Get top opportunities from database
   */
  async getTopOpportunities(count: number = 10): Promise<KeywordOpportunity[]> {
    const { data, error } = await this.supabase
      .from('keyword_opportunities')
      .select('*')
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .order('search_volume', { ascending: false })
      .limit(count);

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

  /**
   * Quick research: just expand seeds without API calls
   */
  async quickResearch(): Promise<KeywordOpportunity[]> {
    console.log('⚡ Quick keyword expansion (no API calls)...\n');

    // Expand seeds with modifiers
    const expanded = expandWithModifiers(HIGH_VOLUME_WINE_SEEDS);

    // Process and score
    const processed = processKeywords(expanded);

    // Convert to database format
    const opportunities = this.convertToOpportunities(processed);

    // Save high-priority ones
    const filtered = opportunities.filter(o => o.priority >= 6).slice(0, limit);

    if (!isDryRun) {
      await this.saveOpportunities(filtered);
    }

    return filtered;
  }
}

export default WineKeywordResearch;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const research = new WineKeywordResearch();

  // Check for quick mode
  const quickMode = args.includes('--quick');

  const runner = quickMode ? research.quickResearch() : research.runKeywordResearch();

  runner
    .then((opportunities) => {
      console.log('\n🎯 Top 15 Keyword Opportunities:');
      console.log('───────────────────────────────────────────────');
      opportunities.slice(0, 15).forEach((opp, i) => {
        console.log(`${String(i + 1).padStart(2)}. [P${opp.priority}] ${opp.keyword}`);
        console.log(`    Vol: ~${opp.search_volume}/mo | Diff: ${opp.keyword_difficulty} | Intent: ${opp.intent}`);
      });
      console.log('\n✅ Keyword research complete!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Keyword research failed:', error);
      process.exit(1);
    });
}
