/**
 * Article Statistics Script
 *
 * Shows current article word counts and identifies thin content that needs enrichment.
 *
 * Usage:
 *   npx tsx src/scripts/article-stats.ts
 */

import fs from 'fs';
import path from 'path';

interface ArticleStats {
  slug: string;
  category: string;
  wordCount: number;
  hasImage: boolean;
  wineCount: number;
}

function analyzeArticles(): ArticleStats[] {
  const stats: ArticleStats[] = [];
  const pagesDir = path.join(process.cwd(), 'src/pages');
  const categories = ['learn', 'wine-pairings', 'buy'];

  for (const category of categories) {
    const categoryDir = path.join(pagesDir, category);
    if (!fs.existsSync(categoryDir)) continue;

    const files = fs.readdirSync(categoryDir);
    for (const file of files) {
      if (!file.endsWith('.astro') || file === 'index.astro') continue;
      if (file.startsWith('[')) continue;

      const slug = file.replace('.astro', '');
      const filePath = path.join(categoryDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Count words
      const textContent = content
        .replace(/---[\s\S]*?---/, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ');
      const wordCount = textContent.split(' ').filter(w => w.length > 0).length;

      // Check for featured image
      const hasImage = content.includes('featuredImage');

      // Count wine recommendations
      const wineMatches = content.match(/<h3[^>]*>[\d]+\./g);
      const wineCount = wineMatches ? wineMatches.length : 0;

      stats.push({ slug, category, wordCount, hasImage, wineCount });
    }
  }

  return stats;
}

function main() {
  console.log('📊 Article Content Analysis\n');
  console.log('═'.repeat(70) + '\n');

  const stats = analyzeArticles();

  // Sort by word count (ascending)
  stats.sort((a, b) => a.wordCount - b.wordCount);

  // Categorize by word count
  const thin = stats.filter(s => s.wordCount < 600);
  const moderate = stats.filter(s => s.wordCount >= 600 && s.wordCount < 1200);
  const good = stats.filter(s => s.wordCount >= 1200 && s.wordCount < 2000);
  const excellent = stats.filter(s => s.wordCount >= 2000);

  console.log('📈 CONTENT DEPTH SUMMARY\n');
  console.log(`   🔴 Thin (<600 words):        ${thin.length} articles - NEED ENRICHMENT`);
  console.log(`   🟡 Moderate (600-1200):      ${moderate.length} articles - Could improve`);
  console.log(`   🟢 Good (1200-2000):         ${good.length} articles`);
  console.log(`   ⭐ Excellent (2000+):        ${excellent.length} articles\n`);

  const avgWords = Math.round(stats.reduce((sum, s) => sum + s.wordCount, 0) / stats.length);
  console.log(`   📊 Average word count: ${avgWords} words`);
  console.log(`   📄 Total articles: ${stats.length}\n`);

  console.log('═'.repeat(70) + '\n');
  console.log('🔴 THIN ARTICLES (Priority for Enrichment)\n');

  // Show thin articles by category
  const thinByCategory: Record<string, ArticleStats[]> = {};
  for (const article of thin) {
    if (!thinByCategory[article.category]) {
      thinByCategory[article.category] = [];
    }
    thinByCategory[article.category].push(article);
  }

  for (const [category, articles] of Object.entries(thinByCategory)) {
    console.log(`   📁 ${category}/ (${articles.length} thin articles)`);
    for (const article of articles.slice(0, 10)) {
      const imageIcon = article.hasImage ? '🖼️ ' : '   ';
      console.log(`      ${imageIcon}${article.slug} (${article.wordCount} words, ${article.wineCount} wines)`);
    }
    if (articles.length > 10) {
      console.log(`      ... and ${articles.length - 10} more`);
    }
    console.log('');
  }

  console.log('═'.repeat(70) + '\n');
  console.log('🎯 ENRICHMENT RECOMMENDATION\n');

  const estimatedAddition = 1500; // Average words added per enrichment
  const targetWordCount = 2000;

  const needEnrichment = stats.filter(s => s.wordCount < targetWordCount);
  const totalWordsToAdd = needEnrichment.reduce((sum, s) => sum + Math.max(0, targetWordCount - s.wordCount), 0);

  console.log(`   Articles needing enrichment: ${needEnrichment.length}`);
  console.log(`   Estimated words to add: ~${totalWordsToAdd.toLocaleString()}`);
  console.log(`   Estimated API calls: ~${needEnrichment.length * 6} (6 sections per article)\n`);

  console.log('   To enrich articles, run:\n');
  console.log('   # Preview what will be processed:');
  console.log('   npm run articles:enrich:dry\n');
  console.log('   # Enrich 5 articles (default):');
  console.log('   npm run articles:enrich\n');
  console.log('   # Enrich specific article:');
  console.log('   npm run articles:enrich -- --article=best-barolo-wines\n');
  console.log('   # Enrich all articles:');
  console.log('   npm run articles:enrich:all\n');

  console.log('═'.repeat(70) + '\n');
  console.log('⚠️  REQUIREMENTS\n');
  console.log('   1. Add ANTHROPIC_API_KEY to .env.local:');
  console.log('      echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env.local\n');
  console.log('   2. Install dependencies:');
  console.log('      npm install\n');
}

main();
