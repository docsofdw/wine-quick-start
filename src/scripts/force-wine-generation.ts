/**
 * Force Wine Generation Script
 * Bypasses daily limits to generate wine pages on demand
 */

import WineContentAutomation from './daily-wine-automation.js';

class ForceWineGeneration extends WineContentAutomation {
  /**
   * Override the daily limit check to always allow generation
   */
  protected async getTodaysPagesCount(): Promise<number> {
    console.log('🚀 Force mode: Bypassing daily limit check');
    return 0; // Always return 0 to bypass the daily limit
  }

  /**
   * Force run workflow with custom page count
   */
  async forceRun(pageCount: number = 5): Promise<void> {
    console.log(`🍷 Force generating ${pageCount} wine pages...`);
    
    try {
      // Step 1: Get unused keywords from database
      const keywords = await this.getUnusedWineKeywords(pageCount);
      
      if (keywords.length === 0) {
        console.log('⚠️  No unused keywords available.');
        console.log('💡 Run "npm run wine:keywords" to research new keywords first.');
        return;
      }
      
      console.log(`🎯 Found ${keywords.length} unused keywords to target`);
      
      // Step 2: Generate pages for unused keywords
      const pages = await this.generateWinePages(keywords);
      
      // Step 3: Quality check each page
      const qualityPages = await this.qualityCheckPages(pages);
      
      // Step 4: Save to database and mark keywords as used
      await this.saveToDatabase(qualityPages);
      
      // Step 5: Generate Astro files
      await this.generateAstroFiles(qualityPages);
      
      console.log(`✅ Successfully force-generated ${qualityPages.length} new wine pages`);
      
      if (qualityPages.length < keywords.length) {
        console.log(`⚠️  ${keywords.length - qualityPages.length} pages failed quality check`);
      }
      
    } catch (error) {
      console.error('❌ Force generation failed:', error);
      throw error;
    }
  }
}

// Get page count from command line argument or default to 5
const pageCount = process.argv[2] ? parseInt(process.argv[2]) : 5;

if (isNaN(pageCount) || pageCount < 1 || pageCount > 20) {
  console.error('❌ Please provide a valid page count (1-20)');
  console.log('Usage: tsx src/scripts/force-wine-generation.ts [number]');
  console.log('Example: tsx src/scripts/force-wine-generation.ts 5');
  process.exit(1);
}

// Run the force generation
const forceGenerator = new ForceWineGeneration();
forceGenerator.forceRun(pageCount)
  .then(() => {
    console.log('🎉 Force wine generation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Force generation failed:', error);
    process.exit(1);
  }); 