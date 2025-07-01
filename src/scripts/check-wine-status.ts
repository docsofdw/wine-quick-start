/**
 * Wine Status Checker Script
 * Shows current status of keywords, pages, and daily limits
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load from .env.local
config({ path: '.env.local', override: true });

class WineStatusChecker {
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
   * Show comprehensive status
   */
  async showStatus(): Promise<void> {
    console.log('🍷 Wine Quick Start - Status Report\n');
    
    // Daily limit status
    await this.showDailyStatus();
    console.log('');
    
    // Keyword research status
    await this.showKeywordStatus();
    console.log('');
    
    // Recent pages
    await this.showRecentPages();
    console.log('');
    
    // Next steps
    this.showNextSteps();
  }

  /**
   * Show today's page creation status
   */
  private async showDailyStatus(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: todayPages, error } = await this.supabase
      .from('wine_pages')
      .select('title, created_at')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error checking daily status:', error);
      return;
    }
    
    const todayCount = todayPages?.length || 0;
    const remaining = Math.max(0, 5 - todayCount);
    
    console.log('📅 Daily Page Creation Status:');
    console.log(`   Created today: ${todayCount}/5 pages`);
    console.log(`   Remaining: ${remaining} pages`);
    
    if (todayCount > 0) {
      console.log('\n   Today\'s pages:');
      todayPages?.forEach((page, i) => {
        const time = new Date(page.created_at).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        console.log(`   ${i + 1}. ${page.title} (${time})`);
      });
    }
    
    if (remaining === 0) {
      console.log('   🎉 Daily limit reached! Come back tomorrow.');
    } else {
      console.log(`   ✅ You can create ${remaining} more pages today.`);
    }
  }

  /**
   * Show keyword research status
   */
  private async showKeywordStatus(): Promise<void> {
    console.log('🔍 Keyword Research Status:');
    
    // Total keywords
    const { data: allKeywords, error: allError } = await this.supabase
      .from('keyword_opportunities')
      .select('status');
    
    if (allError) {
      console.error('Error checking keywords:', allError);
      return;
    }
    
    const total = allKeywords?.length || 0;
    const used = allKeywords?.filter(k => k.status === 'used').length || 0;
    const available = total - used;
    
    console.log(`   Total keywords researched: ${total}`);
    console.log(`   Used for pages: ${used}`);
    console.log(`   Available for new pages: ${available}`);
    
    if (available === 0) {
      console.log('   ⚠️  No keywords available - run keyword research!');
    } else if (available < 10) {
      console.log(`   ⚠️  Low keyword count - consider running more research`);
    } else {
      console.log(`   ✅ Good keyword supply available`);
    }
    
    // Show top available keywords
    const { data: topKeywords } = await this.supabase
      .from('keyword_opportunities')
      .select('keyword, search_volume, priority')
      .or('status.is.null,status.eq.active')
      .order('priority', { ascending: false })
      .order('search_volume', { ascending: false })
      .limit(5);
    
    if (topKeywords && topKeywords.length > 0) {
      console.log('\n   Top available keywords:');
      topKeywords.forEach((kw, i) => {
        console.log(`   ${i + 1}. "${kw.keyword}" (Vol: ${kw.search_volume}, Priority: ${kw.priority})`);
      });
    }
  }

  /**
   * Show recent pages created
   */
  private async showRecentPages(): Promise<void> {
    console.log('📄 Recent Pages Created:');
    
    const { data: recentPages, error } = await this.supabase
      .from('wine_pages')
      .select('title, slug, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching recent pages:', error);
      return;
    }
    
    if (!recentPages || recentPages.length === 0) {
      console.log('   No pages created yet.');
      return;
    }
    
    recentPages.forEach((page, i) => {
      const date = new Date(page.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      console.log(`   ${i + 1}. ${page.title}`);
      console.log(`      URL: /wine-pairings/${page.slug}/`);
      console.log(`      Created: ${date}\n`);
    });
  }

  /**
   * Show recommended next steps
   */
  private showNextSteps(): void {
    console.log('🎯 Recommended Next Steps:');
    console.log('');
    console.log('   To create more pages:');
    console.log('   → npm run wine:daily');
    console.log('');
    console.log('   To research more keywords:');
    console.log('   → npm run wine:keywords');
    console.log('');
    console.log('   To check your site:');
    console.log('   → npm run dev');
    console.log('   → Visit http://localhost:4321');
    console.log('');
    console.log('   To see this status again:');
    console.log('   → npm run wine:status');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new WineStatusChecker();
  checker.showStatus()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Status check failed:', error);
      process.exit(1);
    });
} 