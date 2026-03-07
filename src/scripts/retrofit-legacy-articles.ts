import fs from 'fs';
import path from 'path';
import {
  type ArticleCategory,
  deriveClusterKey,
  determineIntentClass,
  determinePageRole,
  suggestLinksForArticle,
} from '../lib/content-graph.js';

const args = process.argv.slice(2);
const write = args.includes('--write');
const dryRun = args.includes('--dry-run') || !write;
const categoryFilter = args.find(arg => arg.startsWith('--category='))?.split('=')[1] as ArticleCategory | undefined;

const SITE_URL = 'https://winesquickstart.com';
const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  learn: 'Wine Guide',
  'wine-pairings': 'Wine Pairing',
  buy: 'Buying Guide',
};

interface RetrofitStats {
  file: string;
  changed: boolean;
  metadataAdded: number;
  canonicalWired: boolean;
  relatedGuidesAdded: boolean;
}

function collectFiles(): string[] {
  const baseDir = path.join(process.cwd(), 'src/pages');
  const categories: ArticleCategory[] = categoryFilter
    ? [categoryFilter]
    : ['learn', 'wine-pairings', 'buy'];
  const files: string[] = [];

  for (const category of categories) {
    const categoryDir = path.join(baseDir, category);
    if (!fs.existsSync(categoryDir)) continue;

    for (const file of fs.readdirSync(categoryDir)) {
      if (!file.endsWith('.astro') || file === 'index.astro' || file.startsWith('[')) continue;
      files.push(path.join(categoryDir, file));
    }
  }

  return files;
}

function slugToKeyword(slug: string): string {
  return slug.replace(/-/g, ' ');
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function buildCanonicalUrl(category: ArticleCategory, slug: string): string {
  return `${SITE_URL}/${category}/${slug}`;
}

function extractQuotedValue(content: string, key: string): string | null {
  const match = content.match(new RegExp(`${key}:\\s*["']([^"']+)["']`));
  return match ? match[1] : null;
}

function extractTitle(content: string, slug: string): string {
  return (
    extractQuotedValue(content, 'title') ||
    extractQuotedValue(content, 'headline') ||
    titleCase(slugToKeyword(slug))
  );
}

function extractDescription(content: string): string | null {
  return extractQuotedValue(content, 'description');
}

function derivePrimaryKeyword(content: string, slug: string): string {
  const keywordsMatch = content.match(/keywords:\s*\[([\s\S]*?)\]/);
  if (keywordsMatch) {
    const firstKeyword = keywordsMatch[1].match(/["']([^"']+)["']/);
    if (firstKeyword?.[1]) return firstKeyword[1];
  }
  return slugToKeyword(slug);
}

function deriveKeywords(keyword: string, slug: string, category: ArticleCategory): string[] {
  const words = keyword.split(/\s+/).filter(Boolean);
  const base = [keyword];
  if (words.length > 1) {
    base.push(words.slice(0, 2).join(' '));
  }
  if (category === 'buy') {
    base.push(`${keyword} buying guide`);
    base.push('best wine to buy');
  } else if (category === 'wine-pairings') {
    base.push(`${keyword} pairing`);
    base.push('wine pairing guide');
  } else {
    base.push(`${keyword} guide`);
    base.push('wine guide');
  }
  base.push(titleCase(slugToKeyword(slug)));
  return Array.from(new Set(base.map(item => item.trim()).filter(Boolean))).slice(0, 5);
}

function buildMetadataBlock(category: ArticleCategory, slug: string, keyword: string): string {
  const canonicalUrl = buildCanonicalUrl(category, slug);
  const clusterKey = deriveClusterKey(keyword);
  const intentClass = determineIntentClass(keyword);
  const pageRole = determinePageRole(keyword, category);
  const keywords = deriveKeywords(keyword, slug, category);
  return [
    `  clusterKey: "${clusterKey}",`,
    `  intentClass: "${intentClass}",`,
    `  pageRole: "${pageRole}",`,
    `  keywords: [${keywords.map(item => `"${item.replace(/"/g, '\\"')}"`).join(', ')}],`,
    `  canonicalUrl: "${canonicalUrl}",`,
  ].join('\n');
}

function buildMetadataLines(category: ArticleCategory, slug: string, keyword: string): Record<string, string> {
  const canonicalUrl = buildCanonicalUrl(category, slug);
  const clusterKey = deriveClusterKey(keyword);
  const intentClass = determineIntentClass(keyword);
  const pageRole = determinePageRole(keyword, category);
  const keywords = deriveKeywords(keyword, slug, category);

  return {
    clusterKey: `  clusterKey: "${clusterKey}",`,
    intentClass: `  intentClass: "${intentClass}",`,
    pageRole: `  pageRole: "${pageRole}",`,
    keywords: `  keywords: [${keywords.map(item => `"${item.replace(/"/g, '\\"')}"`).join(', ')}],`,
    canonicalUrl: `  canonicalUrl: "${canonicalUrl}",`,
  };
}

function ensureFrontmatterMetadata(content: string, category: ArticleCategory, slug: string): { output: string; added: number } {
  if (!content.includes('const frontmatter = {')) return { output: content, added: 0 };
  const keyword = derivePrimaryKeyword(content, slug);
  const metadataLines = buildMetadataLines(category, slug, keyword);
  let output = content;
  const missingKeys = Object.keys(metadataLines).filter(key => !content.includes(`${key}:`));
  if (missingKeys.length === 0) return { output: content, added: 0 };

  const block = missingKeys.map(key => metadataLines[key]).join('\n');
  output = output.replace(/const frontmatter = \{/, match => `${match}\n${block}\n`);

  return { output, added: missingKeys.length };
}

function ensureRetrofitMetadataConst(content: string, category: ArticleCategory, slug: string): { output: string; added: number } {
  if (content.includes('const frontmatter = {') || content.includes('const retrofitMetadata = {')) {
    return { output: content, added: 0 };
  }

  const keyword = derivePrimaryKeyword(content, slug);
  const block = `const retrofitMetadata = {\n${buildMetadataBlock(category, slug, keyword)}\n};\n\n`;
  const importBlockMatch = content.match(/^(---\n(?:import .*;\n)+)/);
  if (!importBlockMatch) return { output: content, added: 0 };

  return {
    output: content.replace(importBlockMatch[1], `${importBlockMatch[1]}${block}`),
    added: 5,
  };
}

function ensureLayoutCanonical(content: string): { output: string; changed: boolean } {
  if (!content.includes('<ArticleLayout')) return { output: content, changed: false };
  if (content.includes('canonical={frontmatter.canonicalUrl}') || content.includes('canonical={retrofitMetadata.canonicalUrl}')) {
    return { output: content, changed: false };
  }

  if (content.includes('const frontmatter = {')) {
    return {
      output: content.replace('<ArticleLayout', '<ArticleLayout canonical={frontmatter.canonicalUrl}'),
      changed: true,
    };
  }

  if (content.includes('const retrofitMetadata = {')) {
    return {
      output: content.replace('<ArticleLayout', '<ArticleLayout canonical={retrofitMetadata.canonicalUrl}'),
      changed: true,
    };
  }

  return { output: content, changed: false };
}

function ensureLayoutCategorySlug(content: string, category: ArticleCategory): string {
  if (!content.includes('<ArticleLayout') || content.includes('categorySlug=')) return content;
  return content.replace('<ArticleLayout', `<ArticleLayout categorySlug="${category}"`);
}

function buildRelatedGuidesSection(keyword: string, category: ArticleCategory, slug: string): string {
  const suggestions = suggestLinksForArticle(keyword, category, 6);
  const normalizedSuggestions = suggestions.map(suggestion => ({
    href: suggestion.href,
    label: suggestion.label,
    reason: suggestion.reason,
    category: suggestion.category,
  }));

  const hubLinks: Array<{ href: string; label: string; reason: string; category: ArticleCategory }> = [
    { href: '/learn', label: 'Wine Guides', reason: 'Learn the broader context', category: 'learn' },
    { href: '/wine-pairings', label: 'Wine Pairings', reason: 'See pairing-focused follow-ups', category: 'wine-pairings' },
    { href: '/buy', label: 'Buying Guides', reason: 'Move into bottle-level decisions', category: 'buy' },
  ];

  const selected: Array<{ href: string; label: string; reason: string; category: ArticleCategory }> = [];
  const usedHrefs = new Set<string>();

  for (const hubLink of hubLinks) {
    selected.push(hubLink);
    usedHrefs.add(hubLink.href);
  }

  for (const suggestion of normalizedSuggestions) {
    if (usedHrefs.has(suggestion.href) || suggestion.href === `/${category}/${slug}`) continue;
    selected.push(suggestion);
    usedHrefs.add(suggestion.href);
  }

  const links = selected
    .filter(item => item.href !== `/${category}/${slug}`)
    .slice(0, 4);

  const items = links.map(link => `
  <li>
    <a href="${link.href}" class="internal-link">${link.label}</a>
    <span class="text-sm text-gray-600"> - ${link.reason}</span>
  </li>`).join('\n');

  return `
  <h2>Related Guides</h2>
  <ul>
${items}
  </ul>`;
}

function ensureRelatedGuides(content: string, category: ArticleCategory, slug: string): { output: string; added: boolean } {
  const keyword = derivePrimaryKeyword(content, slug);
  const section = buildRelatedGuidesSection(keyword, category, slug);
  const existingSectionPattern = /\n\s*<h2>Related Guides<\/h2>[\s\S]*?(?=\n\s*<h2>|\n\s*<!-- Author Bio Footer -->|\n\s*<div class="mt-12|\n\s*<\/ArticleLayout>)/;
  if (existingSectionPattern.test(content)) {
    return {
      output: content.replace(existingSectionPattern, `\n${section}\n\n`),
      added: false,
    };
  }

  const authorFooterIndex = content.indexOf('About the Author');
  if (authorFooterIndex >= 0) {
    const headingIndex = content.lastIndexOf('<h2', authorFooterIndex);
    if (headingIndex >= 0) {
      return {
        output: `${content.slice(0, headingIndex)}${section}\n\n${content.slice(headingIndex)}`,
        added: true,
      };
    }
  }

  const faqIndex = content.indexOf('<h2>Frequently Asked Questions</h2>');
  if (faqIndex >= 0) {
    return {
      output: `${content.slice(0, faqIndex)}${section}\n\n${content.slice(faqIndex)}`,
      added: true,
    };
  }

  const closeIndex = content.lastIndexOf('</ArticleLayout>');
  if (closeIndex >= 0) {
    return {
      output: `${content.slice(0, closeIndex)}${section}\n\n${content.slice(closeIndex)}`,
      added: true,
    };
  }

  return { output: content, added: false };
}

function retrofitFile(filePath: string): RetrofitStats {
  const original = fs.readFileSync(filePath, 'utf-8');
  const slug = path.basename(filePath, '.astro');
  const category = path.basename(path.dirname(filePath)) as ArticleCategory;
  let output = original;
  let metadataAdded = 0;
  let canonicalWired = false;
  let relatedGuidesAdded = false;

  const frontmatterResult = ensureFrontmatterMetadata(output, category, slug);
  output = frontmatterResult.output;
  metadataAdded += frontmatterResult.added;

  const retrofitConstResult = ensureRetrofitMetadataConst(output, category, slug);
  output = retrofitConstResult.output;
  metadataAdded += retrofitConstResult.added;

  output = ensureLayoutCategorySlug(output, category);

  const canonicalResult = ensureLayoutCanonical(output);
  output = canonicalResult.output;
  canonicalWired = canonicalResult.changed;

  const relatedResult = ensureRelatedGuides(output, category, slug);
  output = relatedResult.output;
  relatedGuidesAdded = relatedResult.added;

  const changed = output !== original;
  if (changed && write) {
    fs.writeFileSync(filePath, output);
  }

  return {
    file: path.relative(process.cwd(), filePath),
    changed,
    metadataAdded,
    canonicalWired,
    relatedGuidesAdded,
  };
}

function main(): void {
  const files = collectFiles();
  const stats = files.map(retrofitFile);
  const changed = stats.filter(stat => stat.changed);

  console.log(`\n🔧 Legacy Article Retrofit (${dryRun ? 'DRY RUN' : 'WRITE'})`);
  console.log(`Files scanned: ${stats.length}`);
  console.log(`Files changed: ${changed.length}`);
  console.log(`Metadata keys added: ${changed.reduce((sum, stat) => sum + stat.metadataAdded, 0)}`);
  console.log(`Canonical props wired: ${changed.filter(stat => stat.canonicalWired).length}`);
  console.log(`Related Guides inserted: ${changed.filter(stat => stat.relatedGuidesAdded).length}`);

  if (changed.length > 0) {
    console.log('\nChanged files:');
    for (const stat of changed.slice(0, 40)) {
      console.log(`  - ${stat.file}`);
    }
    if (changed.length > 40) {
      console.log(`  ... and ${changed.length - 40} more`);
    }
  }

  if (dryRun) {
    console.log('\nRun with --write to apply changes.');
  }
}

main();
