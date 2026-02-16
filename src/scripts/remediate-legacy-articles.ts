/**
 * Legacy Article Remediation Script
 *
 * Cleans recurring formatting issues in existing articles:
 * - duplicate "More Excellent Options" sections
 * - malformed utility classes like font-semibel/font-semibeled
 * - markdown artifacts like <p>## Heading ...</p>
 * - empty "Continue Reading" blocks
 * - markdown bold markers in list items
 *
 * Usage:
 *   npx tsx src/scripts/remediate-legacy-articles.ts --dry-run
 *   npx tsx src/scripts/remediate-legacy-articles.ts --write
 *   npx tsx src/scripts/remediate-legacy-articles.ts --write --category=learn
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const write = args.includes('--write');
const dryRun = args.includes('--dry-run') || !write;
const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1];

const pagesDir = path.join(process.cwd(), 'src/pages');
const categories = categoryFilter ? [categoryFilter] : ['learn', 'wine-pairings', 'buy'];

interface FileStats {
  file: string;
  changed: boolean;
  duplicateMoreOptionsRemoved: number;
  malformedFontFixed: number;
  markdownParagraphRemoved: number;
  emptyContinueReadingRemoved: number;
  markdownBoldFixed: number;
}

function replaceCount(input: string, regex: RegExp, replacement: string): { output: string; count: number } {
  const matches = input.match(regex);
  if (!matches) {
    return { output: input, count: 0 };
  }

  return {
    output: input.replace(regex, replacement),
    count: matches.length,
  };
}

function dedupeMoreExcellentOptions(content: string): { output: string; removed: number } {
  const sectionPattern = /<h2>More Excellent Options<\/h2>\s*<div class="grid md:grid-cols-2 gap-4 my-6">[\s\S]*?<\/div>/g;
  const sections = content.match(sectionPattern);
  if (!sections || sections.length <= 1) {
    return { output: content, removed: 0 };
  }

  let seen = false;
  let removed = 0;
  const output = content.replace(sectionPattern, (match) => {
    if (!seen) {
      seen = true;
      return match;
    }
    removed++;
    return '';
  });

  return { output, removed };
}

function removeMarkdownHeadingParagraphs(content: string): { output: string; removed: number } {
  // Removes full paragraph blocks that start with markdown heading syntax (legacy artifact).
  const pattern = /<p>\s*##[\s\S]*?<\/p>\s*/g;
  const matches = content.match(pattern);
  return {
    output: content.replace(pattern, ''),
    removed: matches ? matches.length : 0,
  };
}

function removeEmptyContinueReadingBlock(content: string): { output: string; removed: number } {
  const pattern = /<!-- Related Articles -->\s*<div class="mt-10 pt-8 border-t border-gray-200">\s*<h3 class="text-xl font-semibold mb-6">Continue Reading<\/h3>\s*<div class="grid md:grid-cols-2 gap-4">\s*<\/div>\s*<\/div>\s*/g;
  const matches = content.match(pattern);
  return {
    output: content.replace(pattern, ''),
    removed: matches ? matches.length : 0,
  };
}

function fixMalformedFontClasses(content: string): { output: string; fixed: number } {
  // Covers values like font-semibel/font-semibeled/font-semibred/font-semibelt/font-semibent/font-semibeld.
  const pattern = /\bfont-semi[a-z]+\b/g;
  const matches = content.match(pattern) || [];
  const malformed = matches.filter(m => m !== 'font-semibold');
  if (malformed.length === 0) {
    return { output: content, fixed: 0 };
  }
  return {
    output: content.replace(pattern, 'font-semibold'),
    fixed: malformed.length,
  };
}

function fixMarkdownBold(content: string): { output: string; fixed: number } {
  const pattern = /\*\*([^*]+)\*\*/g;
  const matches = content.match(pattern);
  return {
    output: content.replace(pattern, '<strong>$1</strong>'),
    fixed: matches ? matches.length : 0,
  };
}

function remediate(content: string): {
  output: string;
  duplicateMoreOptionsRemoved: number;
  malformedFontFixed: number;
  markdownParagraphRemoved: number;
  emptyContinueReadingRemoved: number;
  markdownBoldFixed: number;
} {
  let output = content;
  let duplicateMoreOptionsRemoved = 0;
  let malformedFontFixed = 0;
  let markdownParagraphRemoved = 0;
  let emptyContinueReadingRemoved = 0;
  let markdownBoldFixed = 0;

  const dedupe = dedupeMoreExcellentOptions(output);
  output = dedupe.output;
  duplicateMoreOptionsRemoved += dedupe.removed;

  const fontFix = fixMalformedFontClasses(output);
  output = fontFix.output;
  malformedFontFixed += fontFix.fixed;

  const markdownParaFix = removeMarkdownHeadingParagraphs(output);
  output = markdownParaFix.output;
  markdownParagraphRemoved += markdownParaFix.removed;

  const continueFix = removeEmptyContinueReadingBlock(output);
  output = continueFix.output;
  emptyContinueReadingRemoved += continueFix.removed;

  const markdownBoldFix = fixMarkdownBold(output);
  output = markdownBoldFix.output;
  markdownBoldFixed += markdownBoldFix.fixed;

  const compact = replaceCount(output, /\n{3,}/g, '\n\n');
  output = compact.output;

  return {
    output,
    duplicateMoreOptionsRemoved,
    malformedFontFixed,
    markdownParagraphRemoved,
    emptyContinueReadingRemoved,
    markdownBoldFixed,
  };
}

function collectArticleFiles(): string[] {
  const files: string[] = [];
  for (const category of categories) {
    const categoryDir = path.join(pagesDir, category);
    if (!fs.existsSync(categoryDir)) continue;

    for (const file of fs.readdirSync(categoryDir)) {
      if (!file.endsWith('.astro') || file === 'index.astro' || file.startsWith('[')) continue;
      files.push(path.join(categoryDir, file));
    }
  }
  return files;
}

function main() {
  console.log(`\n🧹 Legacy Article Remediation (${dryRun ? 'DRY RUN' : 'WRITE'})`);
  if (categoryFilter) {
    console.log(`Category filter: ${categoryFilter}`);
  }
  console.log('');

  const files = collectArticleFiles();
  const stats: FileStats[] = [];

  for (const filePath of files) {
    const original = fs.readFileSync(filePath, 'utf-8');
    const remediated = remediate(original);
    const changed = remediated.output !== original;
    const relative = path.relative(process.cwd(), filePath);

    if (changed && write) {
      fs.writeFileSync(filePath, remediated.output);
    }

    stats.push({
      file: relative,
      changed,
      duplicateMoreOptionsRemoved: remediated.duplicateMoreOptionsRemoved,
      malformedFontFixed: remediated.malformedFontFixed,
      markdownParagraphRemoved: remediated.markdownParagraphRemoved,
      emptyContinueReadingRemoved: remediated.emptyContinueReadingRemoved,
      markdownBoldFixed: remediated.markdownBoldFixed,
    });
  }

  const changed = stats.filter(s => s.changed);
  const summary = {
    filesScanned: stats.length,
    filesChanged: changed.length,
    duplicateMoreOptionsRemoved: changed.reduce((n, s) => n + s.duplicateMoreOptionsRemoved, 0),
    malformedFontFixed: changed.reduce((n, s) => n + s.malformedFontFixed, 0),
    markdownParagraphRemoved: changed.reduce((n, s) => n + s.markdownParagraphRemoved, 0),
    emptyContinueReadingRemoved: changed.reduce((n, s) => n + s.emptyContinueReadingRemoved, 0),
    markdownBoldFixed: changed.reduce((n, s) => n + s.markdownBoldFixed, 0),
  };

  console.log('Summary:');
  console.log(`  Files scanned: ${summary.filesScanned}`);
  console.log(`  Files changed: ${summary.filesChanged}`);
  console.log(`  Duplicate "More Excellent Options" removed: ${summary.duplicateMoreOptionsRemoved}`);
  console.log(`  Malformed font classes fixed: ${summary.malformedFontFixed}`);
  console.log(`  Markdown heading paragraphs removed: ${summary.markdownParagraphRemoved}`);
  console.log(`  Empty Continue Reading blocks removed: ${summary.emptyContinueReadingRemoved}`);
  console.log(`  Markdown bold markers fixed: ${summary.markdownBoldFixed}`);

  if (changed.length > 0) {
    console.log('\nChanged files:');
    for (const file of changed.slice(0, 40)) {
      console.log(`  - ${file.file}`);
    }
    if (changed.length > 40) {
      console.log(`  ... and ${changed.length - 40} more`);
    }
  }

  if (dryRun) {
    console.log('\nRun with --write to apply these changes.');
  }
}

main();
