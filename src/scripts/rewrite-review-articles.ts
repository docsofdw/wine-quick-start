import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { scoreAllArticles, type QAScore } from './qa-score-article.js';
import { getAdditionalWinesForArticle, type WineRecommendation } from '../lib/wine-catalog.js';
import { getContentType } from '../lib/content-enrichment-templates.js';
import type { ArticleCategory } from '../lib/content-graph.js';

config({ path: '.env.local', override: true });

const anthropicKey = process.env.ANTHROPIC_API_KEY;
if (!anthropicKey) {
  console.error('❌ Missing ANTHROPIC_API_KEY in .env.local');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: anthropicKey });
const args = process.argv.slice(2);
const write = args.includes('--write');
const dryRun = args.includes('--dry-run') || !write;
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 36;
const articleArg = args.find(arg => arg.startsWith('--article='));
const targetArticle = articleArg ? articleArg.split('=')[1] : null;
const categoryArg = args.find(arg => arg.startsWith('--category='));
const categoryFilter = categoryArg ? categoryArg.split('=')[1] as ArticleCategory : null;
const timeoutArg = args.find(arg => arg.startsWith('--timeout-seconds='));
const timeoutSeconds = timeoutArg ? parseInt(timeoutArg.split('=')[1], 10) : 90;

interface RewriteTarget {
  slug: string;
  category: ArticleCategory;
  filePath: string;
  title: string;
  description: string;
  keyword: string;
  score: number;
  issues: string[];
}

interface LegacyWineCard {
  name: string;
  region?: string;
  notes?: string;
  type?: string;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`)), timeoutMs)),
  ]);
}

function extractValue(content: string, key: string): string | null {
  const singleLine = content.match(new RegExp(`${key}:\\s*["']([^"']+)["']`));
  if (singleLine) return singleLine[1];
  const propValue = content.match(new RegExp(`${key}=["']([^"']+)["']`));
  return propValue ? propValue[1] : null;
}

function slugToKeyword(slug: string): string {
  return slug.replace(/-/g, ' ');
}

function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function extractKeyword(content: string, slug: string): string {
  const keywordsMatch = content.match(/keywords:\s*\[([\s\S]*?)\]/);
  if (keywordsMatch) {
    const first = keywordsMatch[1].match(/["']([^"']+)["']/);
    if (first?.[1]) return first[1];
  }
  const title = extractValue(content, 'title');
  if (title) {
    return title
      .replace(/: Complete Guide from Sommeliers/i, '')
      .replace(/ - Expert Pairing Guide/i, '')
      .replace(/ - Expert Guide/i, '')
      .replace(/: Complete Guide & Recommendations/i, '')
      .trim()
      .toLowerCase();
  }
  return slugToKeyword(slug);
}

function extractExistingWineNames(content: string): string[] {
  const names = new Set<string>();
  for (const match of content.matchAll(/<h3[^>]*>\d+\.\s*([^<]+)<\/h3>/g)) {
    names.add(match[1].trim());
  }
  for (const match of content.matchAll(/<h3[^>]*class="[^"]*text-lg font-semibold[^"]*"[^>]*>([^<]+)<\/h3>/g)) {
    names.add(match[1].trim());
  }
  return Array.from(names);
}

function extractLegacyWineCards(content: string): LegacyWineCard[] {
  const match = content.match(/wines:\s*(\[[\s\S]*?\])\s*\n\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]) as LegacyWineCard[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function extractAuthorBlock(content: string): string {
  const start = content.indexOf('<ArticleLayout');
  if (start < 0) return '';
  const openEnd = content.indexOf('>', start);
  const quickAnswerIndex = content.indexOf('slot="quick-answer"');
  if (openEnd < 0 || quickAnswerIndex < 0 || quickAnswerIndex <= openEnd) return '';
  const quickAnswerTagStart = content.lastIndexOf('<', quickAnswerIndex);
  if (quickAnswerTagStart < 0) return '';
  const between = content.slice(openEnd + 1, quickAnswerTagStart);
  return between.trim();
}

function buildWineCards(wines: WineRecommendation[], heading: string): string {
  if (wines.length === 0) return '';
  const cards = wines.map((wine, index) => `  <div class="bg-gray-50 rounded-lg p-5 border border-gray-100">
    <h3 class="text-lg font-semibold text-wine-700 mb-1">${index + 1}. ${wine.name}</h3>
    <p class="text-sm text-gray-600 mb-2">${wine.region}</p>
    <p class="text-gray-700 text-sm">${wine.notes}</p>
    <p class="text-xs text-wine-600 mt-2"><strong>Variety:</strong> ${wine.variety || wine.wine_type}</p>
  </div>`).join('\n');

  return `<h2>${heading}</h2>\n<div class="grid md:grid-cols-2 gap-4 my-6">\n${cards}\n</div>`;
}

function buildLegacyWineCards(wines: LegacyWineCard[], heading: string): string {
  if (wines.length === 0) return '';
  const cards = wines.slice(0, 4).map((wine, index) => `  <div class="bg-gray-50 rounded-lg p-5 border border-gray-100">
    <h3 class="text-lg font-semibold text-wine-700 mb-1">${index + 1}. ${wine.name}</h3>
    <p class="text-sm text-gray-600 mb-2">${wine.region || 'Wine Region'}</p>
    <p class="text-gray-700 text-sm">${wine.notes || 'A useful bottle to compare against other options in this style and price range.'}</p>
    <p class="text-xs text-wine-600 mt-2"><strong>Variety:</strong> ${wine.type || 'wine'}</p>
  </div>`).join('\n');
  return `<h2>${heading}</h2>\n<div class="grid md:grid-cols-2 gap-4 my-6">\n${cards}\n</div>`;
}

function buildRelatedGuides(keyword: string, category: ArticleCategory): string {
  const hubLinks = [
    { href: '/learn', label: 'Wine Guides', reason: 'Learn the broader context' },
    { href: '/wine-pairings', label: 'Wine Pairings', reason: 'See pairing-focused follow-ups' },
    { href: '/buy', label: 'Buying Guides', reason: 'Move into bottle-level decisions' },
  ];

  return `<h2>Related Guides</h2>
<ul>
${hubLinks.map(link => `  <li><a href="${link.href}" class="internal-link">${link.label}</a><span class="text-sm text-gray-600"> - ${link.reason}</span></li>`).join('\n')}
</ul>`;
}

function buildAuthorAttribution(content: string): string {
  const author = extractValue(content, 'author');
  if (!author) return '';
  const authorSlug = extractValue(content, 'authorSlug');
  const initials = author
    .replace(/,.*$/, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');

  if (authorSlug) {
    return `<div class="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
  <h3 class="text-lg font-semibold mb-3">About the Author</h3>
  <div class="flex items-start gap-4">
    <div class="w-12 h-12 rounded-full bg-wine-100 flex items-center justify-center text-wine-700 font-bold">
      ${initials}
    </div>
    <div>
      <a href="/about/${authorSlug}" class="font-semibold text-gray-900 hover:text-wine-600">${author.replace(/"/g, '&quot;')}</a>
      <p class="text-sm text-gray-600">Wine Quick Start contributor</p>
    </div>
  </div>
</div>`;
  }

  return `<div class="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
  <h3 class="text-lg font-semibold mb-3">About the Author</h3>
  <div class="flex items-start gap-4">
    <div class="w-12 h-12 rounded-full bg-wine-100 flex items-center justify-center text-wine-700 font-bold">
      ${initials}
    </div>
    <div>
      <p class="font-semibold text-gray-900">${author.replace(/"/g, '&quot;')}</p>
      <p class="text-sm text-gray-600">Wine Quick Start contributor</p>
    </div>
  </div>
</div>`;
}

function normalizeDescription(description: string, keyword: string, category: ArticleCategory): string {
  if (description.includes('...') || /perfect .* - wine expert tips/i.test(description)) {
    const label = category === 'buy' ? 'buying guide' : category === 'wine-pairings' ? 'pairing guide' : 'guide';
    return `Expert ${label} for ${keyword}. Get sommelier-backed recommendations, key style cues, and practical tips without the filler.`;
  }
  return description;
}

function normalizeTitle(title: string, keyword: string, category: ArticleCategory): string {
  if (/perfect .* - wine expert tips/i.test(title)) {
    if (category === 'buy') return `${titleCase(keyword)}: Complete Buying Guide`;
    if (category === 'wine-pairings') return `${titleCase(keyword)}: Sommelier Pairing Guide`;
    return `${titleCase(keyword)}: Complete Guide from Sommeliers`;
  }
  return title;
}

function updateMetadata(content: string, title: string, description: string, readMinutes: number): string {
  let output = content;
  output = output.replace(/title:\s*["'][^"']+["']/, `title: "${title.replace(/"/g, '\\"')}"`);
  output = output.replace(/description:\s*["'][^"']*["']/, `description: "${description.replace(/"/g, '\\"')}"`);
  output = output.replace(/readTime:\s*["'][^"']+["']/, `readTime: "${readMinutes} min"`);
  output = output.replace(/title=["'][^"']+["']/, `title="${title.replace(/"/g, '\\"')}"`);
  output = output.replace(/description=["'][^"']*["']/, `description="${description.replace(/"/g, '\\"')}"`);
  output = output.replace(/readTime=["'][^"']+["']/, `readTime="${readMinutes} min"`);
  return output;
}

function getRewriteInstructions(category: ArticleCategory, keyword: string): string {
  const contentType = getContentType(keyword);
  if (category === 'buy' || contentType === 'buying') {
    return `Write a decision-focused buying page. Include:
- one quick answer
- 4-5 H2 sections
- a section on how to judge value and what to avoid
- a section on price tiers or buyer fit
- concise, useful copy
- no fake claims of testing hundreds of bottles`;
  }
  if (category === 'wine-pairings' || contentType === 'pairing') {
    return `Write a practical pairing page. Include:
- one quick answer
- 4-5 H2 sections
- why the pairing works
- best styles by preparation or sauce
- common mistakes to avoid
- concise, direct language`;
  }
  if (contentType === 'comparison') {
    return `Write a comparison page. Include:
- one quick answer
- 4-5 H2 sections
- head-to-head differences
- when to choose each option
- price and pairing guidance
- concise, clear comparisons`;
  }
  return `Write a strong educational guide. Include:
- one quick answer
- 4-5 H2 sections
- concrete style/taste guidance
- food or buying context where relevant
- concise language, not encyclopedia sprawl`;
}

function buildRewritePrompt(target: RewriteTarget, existingWineNames: string[], includeWineCards: boolean): string {
  const issueSummary = target.issues.slice(0, 6).join('; ');
  const wineCardInstruction = includeWineCards
    ? `Include the exact marker <!-- WINE_CARDS --> once where bottle recommendations should appear.`
    : `Do not include bottle cards or recommendation markers.`;

  return `You are rewriting a published wine article so it ranks better and reads like a human expert, not AI filler.

Article details:
- title: ${target.title}
- keyword: ${target.keyword}
- category: ${target.category}
- current score: ${target.score}
- current issues: ${issueSummary}

Requirements:
${getRewriteInstructions(target.category, target.keyword)}
- Keep the article focused on the search intent for "${target.keyword}"
- Aim for 1400-1900 words
- Use short, clear paragraphs
- Avoid these phrases: "in this guide", "when it comes to", "robust", "nuanced", "pairs beautifully with", "dive into", "delve into"
- No filler intros
- No duplicate sections
- No placeholder text
- No markdown fences
- Use only HTML
- Start with <div slot="quick-answer"> and include a direct answer in 40-60 words
- Include <h2>Expert Tips</h2> with an ordered list of 6-8 concrete tips
- Include the exact marker <!-- RELATED_GUIDES --> where related guides should go
- Include <h2>Frequently Asked Questions</h2> followed by a <div class="space-y-6"> block with 6-8 useful FAQs
- ${wineCardInstruction}

Known existing wine names to avoid repeating if you mention bottles: ${existingWineNames.join(', ') || 'none'}

Return only the HTML fragment that belongs inside <ArticleLayout>.`;
}

async function rewriteHtml(target: RewriteTarget, existingWineNames: string[]): Promise<string> {
  const includeWineCards = target.category !== 'learn' || /best|price|under |buy/i.test(target.keyword);
  const response = await withTimeout(
    anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 5000,
      system: 'You rewrite wine articles for search intent, clarity, and topical authority. Return only valid HTML fragments.',
      messages: [{ role: 'user', content: buildRewritePrompt(target, existingWineNames, includeWineCards) }],
    }),
    timeoutSeconds * 1000,
    `rewrite for ${target.slug}`
  );

  const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
  if (!text.includes('slot="quick-answer"') || !text.includes('Frequently Asked Questions')) {
    throw new Error(`rewrite output for ${target.slug} was missing required sections`);
  }
  return text;
}

async function fetchWineCards(target: RewriteTarget, existingWineNames: string[]): Promise<string> {
  const shouldFetch = target.category === 'buy' || target.category === 'wine-pairings' || /best|price|under /i.test(target.keyword);
  if (!shouldFetch) return '';
  const wines = await withTimeout(
    getAdditionalWinesForArticle(target.keyword, existingWineNames, target.category === 'buy' ? 4 : 3),
    30000,
    `wine lookup for ${target.slug}`
  ).catch(() => []);

  if (!Array.isArray(wines) || wines.length === 0) return '';
  const heading = target.category === 'buy' ? 'Bottle Picks Worth Considering' : 'Real Bottles To Explore';
  return buildWineCards(wines, heading);
}

function replaceArticleBody(content: string, newBody: string): string {
  const layoutMatch = content.match(/(<ArticleLayout[\s\S]*?>)([\s\S]*)(<\/ArticleLayout>)/);
  if (!layoutMatch) {
    throw new Error('Could not find ArticleLayout boundaries');
  }

  const [, openTag, oldBody, closeTag] = layoutMatch;
  const authorBlock = extractAuthorBlock(content);
  const finalBody = [authorBlock, newBody.trim()].filter(Boolean).join('\n\n');
  return content.replace(`${openTag}${oldBody}${closeTag}`, `${openTag}\n\n${finalBody}\n\n${closeTag}`);
}

function normalizeQuickAnswer(html: string): string {
  const trimmed = html.replace(/^\s*<div\s*(?=<div slot="quick-answer")/, '');
  return trimmed.replace(/<div slot="quick-answer">\s*([^<][\s\S]*?)\s*<\/div>/, (_match, answer) => {
    const text = String(answer).replace(/\s+/g, ' ').trim();
    return `<div slot="quick-answer">\n  <p><strong>Quick Answer:</strong> ${text}</p>\n</div>`;
  });
}

function collectTargets(scores: QAScore[]): RewriteTarget[] {
  return scores
    .filter(score => score.status === 'review')
    .filter(score => !targetArticle || score.slug === targetArticle)
    .filter(score => !categoryFilter || score.category === categoryFilter)
    .sort((a, b) => a.totalScore - b.totalScore)
    .slice(0, limit)
    .map(score => {
      const content = fs.readFileSync(score.filePath, 'utf-8');
      const keyword = extractKeyword(content, score.slug);
      return {
        slug: score.slug,
        category: score.category as ArticleCategory,
        filePath: score.filePath,
        title: normalizeTitle(extractValue(content, 'title') || titleCase(keyword), keyword, score.category as ArticleCategory),
        description: normalizeDescription(extractValue(content, 'description') || '', keyword, score.category as ArticleCategory),
        keyword,
        score: score.totalScore,
        issues: score.issues,
      };
    });
}

async function processTarget(target: RewriteTarget): Promise<{ before: number; after: number | null; error?: string }> {
  const original = fs.readFileSync(target.filePath, 'utf-8');
  const existingWineNames = extractExistingWineNames(original);
  const legacyWineCards = extractLegacyWineCards(original);
  const rewrittenHtml = await rewriteHtml(target, existingWineNames);
  const wineCards = await fetchWineCards(target, existingWineNames);
  const fallbackWineCards = !wineCards && legacyWineCards.length > 0
    ? buildLegacyWineCards(legacyWineCards, target.category === 'buy' ? 'Bottle Picks Worth Considering' : 'Real Bottles To Explore')
    : '';
  let withCards = rewrittenHtml
    .replace('<!-- WINE_CARDS -->', wineCards ? `${wineCards}\n\n` : fallbackWineCards ? `${fallbackWineCards}\n\n` : '')
    .replace('<!-- RELATED_GUIDES -->', buildRelatedGuides(target.keyword, target.category));
  withCards = normalizeQuickAnswer(withCards);
  const cardsBlock = wineCards || fallbackWineCards;
  if (cardsBlock && !withCards.includes('Bottle Picks Worth Considering') && !withCards.includes('Real Bottles To Explore')) {
    withCards = withCards.replace('<h2>Expert Tips</h2>', `${cardsBlock}\n\n<h2>Expert Tips</h2>`);
  }
  const replaced = replaceArticleBody(original, withCards);
  const authorBlock = extractAuthorBlock(replaced);
  const withAuthor = authorBlock ? replaced : replaceArticleBody(replaced, `${buildAuthorAttribution(original)}\n\n${withCards}`);
  const newWordCount = withAuthor
    .replace(/---[\s\S]*?---/, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
  const readMinutes = Math.max(5, Math.ceil(newWordCount / 220));
  const updated = updateMetadata(withAuthor, target.title, target.description, readMinutes);

  if (!dryRun) {
    fs.writeFileSync(target.filePath, updated);
  }

  const rescored = await scoreAllArticles(target.category);
  const updatedScore = rescored.find(score => score.slug === target.slug)?.totalScore ?? null;
  return { before: target.score, after: updatedScore };
}

async function main(): Promise<void> {
  console.log(`\n✍️ Review Article Rewriter (${dryRun ? 'DRY RUN' : 'WRITE'})`);
  const scores = await scoreAllArticles();
  const targets = collectTargets(scores);

  console.log(`Targets: ${targets.length}`);
  for (const target of targets) {
    console.log(`  - ${target.category}/${target.slug} (${target.score})`);
  }

  const results: Array<{ slug: string; category: string; before: number; after: number | null; error?: string }> = [];

  for (const target of targets) {
    console.log(`\n🔄 Rewriting ${target.category}/${target.slug}...`);
    try {
      const result = await processTarget(target);
      results.push({ slug: target.slug, category: target.category, ...result });
      console.log(`   ✅ ${target.score} -> ${result.after ?? 'n/a'}`);
    } catch (error: any) {
      results.push({ slug: target.slug, category: target.category, before: target.score, after: null, error: error.message });
      console.log(`   ❌ ${error.message}`);
    }
  }

  console.log('\nSummary:');
  const succeeded = results.filter(result => !result.error);
  const failed = results.filter(result => result.error);
  console.log(`  Succeeded: ${succeeded.length}`);
  console.log(`  Failed: ${failed.length}`);
  for (const result of failed) {
    console.log(`  - ${result.category}/${result.slug}: ${result.error}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
