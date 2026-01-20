#!/usr/bin/env npx tsx
/**
 * Fix Meta Descriptions Script
 * Improves short meta descriptions to optimal 150-160 character length
 */

import * as fs from 'fs';
import * as path from 'path';

const PAGES_DIR = path.join(process.cwd(), 'src/pages');

// Generate improved descriptions based on article type and topic
function generateDescription(title: string, filePath: string, currentDesc: string): string {
  const slug = path.basename(filePath, '.astro');
  const dir = path.dirname(filePath).split('/').pop();

  // Extract the main topic from the title (remove "- Expert Guide" suffix)
  const topic = title.replace(/ - Expert Guide$/i, '').replace(/: .*$/, '').toLowerCase();

  // Determine article type from path and title
  const isBestList = title.toLowerCase().includes('best ');
  const isComparison = title.toLowerCase().includes(' vs ');
  const isPairing = dir === 'wine-pairings' || title.toLowerCase().includes('pairing') || title.toLowerCase().includes('food');
  const isRegion = /napa|sonoma|bordeaux|burgundy|champagne|oregon|willamette|california|barolo/i.test(topic);
  const isVarietal = /cabernet|merlot|pinot|chardonnay|sauvignon|zinfandel|syrah|shiraz|riesling|prosecco|malbec|rose/i.test(topic);

  let newDesc = '';

  if (isComparison) {
    // VS articles: "Cabernet Sauvignon Vs Merlot"
    const parts = topic.split(' vs ');
    if (parts.length === 2) {
      newDesc = `Compare ${parts[0].trim()} and ${parts[1].trim()}: key differences in taste, food pairings, and when to choose each. Expert sommelier insights to help you pick the perfect wine.`;
    }
  } else if (isPairing && topic.includes('with')) {
    // Food pairing: "Best Wine With Steak"
    const food = topic.replace(/best wine with |wine with /i, '').trim();
    newDesc = `Find the perfect wine to pair with ${food}. Our certified sommeliers share top picks, flavor matching tips, and serving suggestions for an unforgettable meal.`;
  } else if (isPairing && topic.includes('food pairing')) {
    // Wine food pairing: "Cabernet Sauvignon Food Pairing"
    const wine = topic.replace(/ food pairing/i, '').trim();
    newDesc = `Master ${wine} food pairing with our expert guide. Discover ideal dishes, flavor combinations, and pro tips from certified sommeliers for perfect pairings every time.`;
  } else if (isPairing && (topic.includes('dinner') || topic.includes('thanksgiving') || topic.includes('christmas'))) {
    // Holiday pairing
    const occasion = topic.replace(/ wine pairing/i, '').trim();
    newDesc = `Choose the perfect wines for ${occasion} with our sommelier-curated guide. Get top recommendations, serving tips, and pairing suggestions for a memorable celebration.`;
  } else if (isBestList && isRegion) {
    // Best regional wines: "Best Napa Valley Wines"
    const region = topic.replace(/best |wines?/gi, '').trim();
    newDesc = `Explore the best ${region} wines with our expert guide. Curated recommendations, tasting notes, and insider tips from certified sommeliers to elevate your collection.`;
  } else if (isBestList && isVarietal) {
    // Best varietal: "Best Cabernet Sauvignon"
    const varietal = topic.replace(/best /i, '').trim();
    newDesc = `Discover outstanding ${varietal} wines with our expert picks. Detailed tasting notes, food pairings, and value recommendations from certified sommeliers.`;
  } else if (isRegion) {
    // Regional guide: "Napa Valley Wine"
    newDesc = `Your complete guide to ${topic}. Explore top producers, signature styles, and expert recommendations from certified sommeliers to find your perfect bottle.`;
  } else if (isVarietal && dir === 'wine-pairings') {
    // Varietal in pairings section
    newDesc = `Everything you need to know about ${topic}: tasting profiles, food pairings, and top bottle recommendations from certified sommeliers. Find your perfect match.`;
  } else if (isVarietal) {
    // General varietal guide
    newDesc = `Your essential guide to ${topic} wine. Learn about flavor profiles, top regions, food pairings, and expert bottle picks from certified sommeliers.`;
  } else if (dir === 'buy') {
    // Buy section articles
    newDesc = `Find the best ${topic} with our expert buying guide. Price comparisons, quality picks, and insider recommendations from certified sommeliers.`;
  } else {
    // Generic fallback - expand the current description
    const baseTopic = topic.replace(/[^a-z ]/gi, '').trim();
    newDesc = `Explore ${baseTopic} with our comprehensive sommelier guide. Expert recommendations, detailed tasting notes, food pairings, and tips for finding the perfect wine.`;
  }

  // Ensure description is within optimal range (150-160 chars)
  if (newDesc.length > 160) {
    // Trim to last complete word before 160
    newDesc = newDesc.substring(0, 157).replace(/\s+\S*$/, '') + '...';
  } else if (newDesc.length < 145) {
    // Pad with additional context if too short
    newDesc = newDesc.replace(/\.$/, '') + ' for any occasion.';
  }

  return newDesc;
}

// Update description in file
function updateDescription(filePath: string): { updated: boolean; oldLen: number; newLen: number; title: string } {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract current title and description
  const titleMatch = content.match(/title:\s*["']([^"']+)["']/);
  const descMatch = content.match(/description:\s*["']([^"']+)["']/);

  if (!titleMatch || !descMatch) {
    return { updated: false, oldLen: 0, newLen: 0, title: '' };
  }

  const title = titleMatch[1];
  const currentDesc = descMatch[1];
  const oldLen = currentDesc.length;

  // Skip if already in optimal range
  if (oldLen >= 145 && oldLen <= 165) {
    return { updated: false, oldLen, newLen: oldLen, title };
  }

  // Generate new description
  const newDesc = generateDescription(title, filePath, currentDesc);
  const newLen = newDesc.length;

  // Replace in content - need to handle both frontmatter description and schema description
  let newContent = content.replace(
    /description:\s*["']([^"']+)["']/,
    `description: "${newDesc}"`
  );

  // Also update the description in structured_data if it exists
  // The schema description should match
  const schemaDescRegex = /"description":\s*"[^"]+"/g;
  let match;
  let isFirst = true;
  while ((match = schemaDescRegex.exec(newContent)) !== null) {
    if (isFirst) {
      // Skip the first one in @graph (Organization description)
      isFirst = false;
      continue;
    }
    // Update Article description in schema
    newContent = newContent.replace(match[0], `"description": "${newDesc}"`);
    break;
  }

  fs.writeFileSync(filePath, newContent);
  return { updated: true, oldLen, newLen, title };
}

// Main
async function main() {
  console.log('\n📝 Fixing Meta Descriptions\n');
  console.log('='.repeat(80));

  const directories = ['learn', 'wine-pairings', 'buy'];
  let totalUpdated = 0;
  const results: Array<{ file: string; title: string; oldLen: number; newLen: number }> = [];

  for (const dir of directories) {
    const dirPath = path.join(PAGES_DIR, dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.astro') && f !== 'index.astro');

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const result = updateDescription(filePath);

      if (result.updated) {
        totalUpdated++;
        results.push({
          file: `${dir}/${file}`,
          title: result.title,
          oldLen: result.oldLen,
          newLen: result.newLen
        });
        console.log(`✅ ${dir}/${file}`);
        console.log(`   ${result.oldLen} → ${result.newLen} chars`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ Updated ${totalUpdated} meta descriptions\n`);

  // Show summary of changes
  if (results.length > 0) {
    const avgOld = Math.round(results.reduce((sum, r) => sum + r.oldLen, 0) / results.length);
    const avgNew = Math.round(results.reduce((sum, r) => sum + r.newLen, 0) / results.length);
    console.log(`📊 Average length: ${avgOld} → ${avgNew} chars`);
  }
}

main().catch(console.error);
