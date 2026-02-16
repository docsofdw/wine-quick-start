/**
 * Refresh article wine recommendations using catalog-backed data.
 *
 * This script updates existing article sections:
 * - "Our Top Picks" (numbered cards)
 * - "More Excellent Options" (grid cards)
 *
 * Usage:
 *   npx tsx src/scripts/refresh-article-wines.ts --dry-run --category=learn
 *   npx tsx src/scripts/refresh-article-wines.ts --write --category=learn
 *   npx tsx src/scripts/refresh-article-wines.ts --write --slug=barolo-wine
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getAdditionalWinesForArticle, getWinesForKeyword, type WineRecommendation } from '../lib/wine-catalog.js';

config({ path: '.env.local', override: true });

const args = process.argv.slice(2);
const isWrite = args.includes('--write');
const isDryRun = args.includes('--dry-run') || !isWrite;
const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1];
const slugFilter = args.find(a => a.startsWith('--slug='))?.split('=')[1];
const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1];
const limit = limitArg ? parseInt(limitArg, 10) : Infinity;

const pagesDir = path.join(process.cwd(), 'src/pages');
const categories = categoryFilter ? [categoryFilter] : ['learn', 'wine-pairings', 'buy'];

interface UpdateResult {
  file: string;
  keyword: string;
  updated: boolean;
  reason?: string;
  topPicksCount?: number;
  extraPicksCount?: number;
}

function extractKeyword(content: string, fallbackSlug: string): string {
  const keywordsArray = content.match(/keywords:\s*\[\s*"([^"]+)"/);
  if (keywordsArray && keywordsArray[1]) {
    return keywordsArray[1];
  }

  const titleMatch = content.match(/title:\s*"([^"]+)"/);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1]
      .replace(/\s*-\s*Expert Guide$/i, '')
      .replace(/\s*:\s*A Comprehensive Guide$/i, '')
      .trim()
      .toLowerCase();
  }

  return fallbackSlug.replace(/-/g, ' ');
}

function extractExistingWineNames(content: string): string[] {
  const names: string[] = [];
  const numbered = content.matchAll(/<h3[^>]*>[\d]+\.\s*([^<]+)<\/h3>/g);
  for (const m of numbered) {
    names.push(m[1].trim());
  }

  const cards = content.matchAll(/<h3[^>]*class="[^"]*text-lg font-semibold[^"]*"[^>]*>([^<]+)<\/h3>/g);
  for (const m of cards) {
    const name = m[1].trim();
    if (!names.includes(name)) {
      names.push(name);
    }
  }

  return names;
}

function renderTopPicks(wines: WineRecommendation[]): string {
  return wines
    .map((wine, i) => `      <div class="bg-gray-50 rounded-lg p-6 mb-4">
        <h3 class="text-xl font-semibold text-wine-700 mb-2">${i + 1}. ${wine.name}</h3>
        <p class="text-gray-600 mb-2"><strong>Producer:</strong> ${wine.producer}</p>
        <p class="text-gray-600 mb-2"><strong>Region:</strong> ${wine.region}</p>
        <p class="text-gray-600 mb-2"><strong>Variety:</strong> ${wine.variety || 'Blend'}</p>
        <p class="text-gray-700 mt-3">${wine.notes}</p>
      </div>`)
    .join('\n\n');
}

function renderMoreOptions(wines: WineRecommendation[]): string {
  if (wines.length === 0) {
    return '';
  }

  const cards = wines
    .map(wine => {
      const priceEstimate = wine.wine_type === 'sparkling'
        ? '$40-80'
        : wine.variety?.toLowerCase().includes('pinot noir')
          ? '$30-60'
          : wine.variety?.toLowerCase().includes('cabernet')
            ? '$35-75'
            : '$25-50';

      return `  <div class="bg-gray-50 rounded-lg p-5 border border-gray-100">
    <h3 class="text-lg font-semibold text-wine-700 mb-1">${wine.name}</h3>
    <p class="text-sm text-gray-600 mb-2">${wine.region} | ~${priceEstimate}</p>
    <p class="text-gray-700 text-sm">${wine.notes}</p>
    <p class="text-xs text-wine-600 mt-2"><strong>Variety:</strong> ${wine.variety || wine.wine_type}</p>
  </div>`;
    })
    .join('\n\n');

  return `<h2>More Excellent Options</h2>
<div class="grid md:grid-cols-2 gap-4 my-6">
${cards}
</div>`;
}

function replaceSection(content: string, heading: string, replacementBody: string): { output: string; replaced: boolean } {
  const sectionPattern = new RegExp(`<h2>${heading}<\\/h2>[\\s\\S]*?(?=<h2>|<!-- Author Bio Footer -->|<\\/ArticleLayout>)`, 'm');
  const replacement = `<h2>${heading}</h2>\n${replacementBody}\n\n`;

  if (sectionPattern.test(content)) {
    return {
      output: content.replace(sectionPattern, replacement),
      replaced: true,
    };
  }

  return { output: content, replaced: false };
}

function replaceFirstAvailableSection(
  content: string,
  headings: string[],
  targetHeading: string,
  replacementBody: string
): { output: string; replaced: boolean } {
  for (const heading of headings) {
    const replaced = replaceSection(content, heading, replacementBody);
    if (replaced.replaced) {
      if (heading === targetHeading) {
        return replaced;
      }
      return {
        output: replaced.output.replace(`<h2>${heading}</h2>`, `<h2>${targetHeading}</h2>`),
        replaced: true,
      };
    }
  }
  return { output: content, replaced: false };
}

function insertTopPicksSection(content: string, topPicksMarkup: string): string {
  const section = `<h2>Our Top Picks</h2>\n${topPicksMarkup}\n\n`;
  const moreOptionsHeading = '<h2>More Excellent Options</h2>';
  const authorAnchor = '<!-- Author Bio Footer -->';

  if (content.includes(moreOptionsHeading)) {
    return content.replace(moreOptionsHeading, `${section}${moreOptionsHeading}`);
  }

  if (content.includes(authorAnchor)) {
    return content.replace(authorAnchor, `${section}${authorAnchor}`);
  }

  return content.replace('</ArticleLayout>', `${section}</ArticleLayout>`);
}

function removeMoreOptions(content: string): string {
  return content.replace(/<h2>More Excellent[^<]*Options<\/h2>\s*<div class="grid md:grid-cols-2 gap-4 my-6">[\s\S]*?<\/div>\s*/g, '');
}

function removeRecommendationSections(content: string): string {
  const headings = [
    'Our Top Picks',
    'Our Top Rosé Picks for Chicken',
    'Expert Wine Recommendations',
    'Expert Recommendations',
    'Top Picks',
    'More Excellent Options',
    'More Excellent Rosé Options',
  ];

  let output = content;
  for (const heading of headings) {
    const sectionPattern = new RegExp(
      `<h2>${heading}<\\/h2>[\\s\\S]*?(?=<h2>|<!-- Author Bio Footer -->|<\\/ArticleLayout>)`,
      'm'
    );
    output = output.replace(sectionPattern, '');
  }

  return output;
}

async function updateFile(filePath: string): Promise<UpdateResult> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const slug = path.basename(filePath, '.astro');
  const keyword = extractKeyword(content, slug);
  const relative = path.relative(process.cwd(), filePath);

  const topPicks = await getWinesForKeyword(keyword, 3);
  if (topPicks.length === 0) {
    const cleaned = removeRecommendationSections(content);
    if (cleaned !== content) {
      if (!isDryRun) {
        fs.writeFileSync(filePath, cleaned);
      }
      return {
        file: relative,
        keyword,
        updated: true,
        reason: 'Removed stale recommendations (no catalog wines)',
        topPicksCount: 0,
        extraPicksCount: 0,
      };
    }
    return { file: relative, keyword, updated: false, reason: 'No matching catalog wines' };
  }

  const existing = extractExistingWineNames(content);
  const extraPicks = await getAdditionalWinesForArticle(keyword, existing, 6);

  let updated = content;
  const topBody = renderTopPicks(topPicks);
  const top = replaceFirstAvailableSection(
    updated,
    ['Our Top Picks', 'Our Top Rosé Picks for Chicken', 'Expert Wine Recommendations', 'Expert Recommendations', 'Top Picks'],
    'Our Top Picks',
    topBody
  );
  updated = top.replaced ? top.output : insertTopPicksSection(updated, topBody);

  // Remove all existing "More Excellent Options" blocks, then re-add exactly one if we have recommendations.
  updated = removeMoreOptions(updated);
  if (extraPicks.length > 0) {
    const insertion = renderMoreOptions(extraPicks);
    const anchor = '<!-- Author Bio Footer -->';
    if (updated.includes(anchor)) {
      updated = updated.replace(anchor, `${insertion}\n\n${anchor}`);
    } else {
      updated = updated.replace('</ArticleLayout>', `${insertion}\n\n</ArticleLayout>`);
    }
  }

  if (updated === content) {
    return { file: relative, keyword, updated: false, reason: 'No changes needed' };
  }

  if (!isDryRun) {
    fs.writeFileSync(filePath, updated);
  }

  return {
    file: relative,
    keyword,
    updated: true,
    topPicksCount: topPicks.length,
    extraPicksCount: extraPicks.length,
  };
}

async function main() {
  console.log(`\n🍷 Refresh Article Wines (${isDryRun ? 'DRY RUN' : 'WRITE'})`);
  if (categoryFilter) console.log(`Category: ${categoryFilter}`);
  if (slugFilter) console.log(`Slug: ${slugFilter}`);
  console.log('');

  const files: string[] = [];
  for (const category of categories) {
    const dir = path.join(pagesDir, category);
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.astro') || file === 'index.astro' || file.startsWith('[')) continue;
      const slug = file.replace('.astro', '');
      if (slugFilter && slug !== slugFilter) continue;
      files.push(path.join(dir, file));
    }
  }

  let processed = 0;
  const results: UpdateResult[] = [];
  for (const filePath of files) {
    if (processed >= limit) break;
    const res = await updateFile(filePath);
    results.push(res);
    processed++;
  }

  const updated = results.filter(r => r.updated);
  const skipped = results.filter(r => !r.updated);

  console.log(`Processed: ${results.length}`);
  console.log(`Updated:   ${updated.length}`);
  console.log(`Skipped:   ${skipped.length}`);

  if (updated.length > 0) {
    console.log('\nUpdated files:');
    for (const r of updated.slice(0, 40)) {
      console.log(`  - ${r.file} (${r.topPicksCount} top, ${r.extraPicksCount} extra)`);
    }
    if (updated.length > 40) {
      console.log(`  ... and ${updated.length - 40} more`);
    }
  }

  if (skipped.length > 0) {
    console.log('\nSkipped files:');
    for (const r of skipped.slice(0, 20)) {
      console.log(`  - ${r.file}: ${r.reason}`);
    }
    if (skipped.length > 20) {
      console.log(`  ... and ${skipped.length - 20} more`);
    }
  }

  if (isDryRun) {
    console.log('\nRun with --write to apply updates.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
