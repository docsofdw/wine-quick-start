import fs from 'fs';
import path from 'path';

export type ArticleCategory = 'learn' | 'wine-pairings' | 'buy';
export type IntentClass = 'informational' | 'commercial' | 'transactional';
export type PageRole = 'seed' | 'supporting' | 'money';

export interface ContentNode {
  slug: string;
  url: string;
  title: string;
  category: ArticleCategory;
  clusterKey: string;
  intentClass: IntentClass;
  pageRole: PageRole;
  robots: string | null;
  keywords: string[];
}

export interface KeywordCandidate {
  keyword: string;
  priority?: number | null;
  search_volume?: number | null;
  status?: string | null;
}

export interface RankedKeywordCandidate extends KeywordCandidate {
  clusterKey: string;
  category: ArticleCategory;
  intentClass: IntentClass;
  pageRole: PageRole;
  score: number;
  clusterCoverage: number;
}

export interface LinkSuggestion {
  href: string;
  label: string;
  reason: string;
  clusterKey: string;
  category: ArticleCategory;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'best', 'buy', 'for', 'guide', 'how', 'in', 'of', 'on', 'price',
  'the', 'to', 'under', 'vs', 'what', 'which', 'with', 'wine',
]);

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter(word => !STOP_WORDS.has(word));
}

export function determineCategoryFromKeyword(keyword: string): ArticleCategory {
  const lower = keyword.toLowerCase();
  if (lower.includes('pairing') || lower.includes('with ') || lower.includes('food')) return 'wine-pairings';
  if (
    lower.includes('buy') ||
    lower.includes('price') ||
    lower.includes('under $') ||
    lower.includes('under 20') ||
    lower.includes('under 50') ||
    lower.includes('budget') ||
    lower.includes('cheap') ||
    lower.includes('affordable')
  ) return 'buy';
  return 'learn';
}

export function determineIntentClass(keyword: string): IntentClass {
  const lower = keyword.toLowerCase();
  if (/buy|shop|order|price|deal|under \$|cheap|affordable|budget/.test(lower)) return 'transactional';
  if (/best|top|review|vs|compare|rating|recommend/.test(lower)) return 'commercial';
  return 'informational';
}

export function determinePageRole(keyword: string, category: ArticleCategory): PageRole {
  if (category === 'buy') return 'money';
  const lower = keyword.toLowerCase();
  if (/\bvs\b|versus|compare|difference|what is|guide|how to|how /.test(lower)) return 'seed';
  return 'supporting';
}

export function deriveClusterKey(text: string): string {
  const words = normalizeWords(text);
  if (words.length === 0) return 'general-wine';
  return words.slice(0, 2).join('-');
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function extractTitle(content: string, slug: string): string {
  const match = content.match(/title:\s*["']([^"']+)["']/);
  return match ? match[1] : slugToTitle(slug);
}

function extractKeywords(content: string): string[] {
  const match = content.match(/keywords:\s*\[([\s\S]*?)\]/);
  if (!match) return [];
  return Array.from(match[1].matchAll(/"([^"]+)"/g)).map(entry => entry[1]);
}

function extractMetadataValue(content: string, key: string): string | null {
  const match = content.match(new RegExp(`${key}:\\s*["']([^"']+)["']`));
  return match ? match[1] : null;
}

export function collectContentGraph(): ContentNode[] {
  const pagesDir = path.join(process.cwd(), 'src/pages');
  const categories: ArticleCategory[] = ['learn', 'wine-pairings', 'buy'];
  const nodes: ContentNode[] = [];

  for (const category of categories) {
    const categoryDir = path.join(pagesDir, category);
    if (!fs.existsSync(categoryDir)) continue;

    for (const file of fs.readdirSync(categoryDir)) {
      if (!file.endsWith('.astro') || file === 'index.astro' || file.startsWith('[')) continue;
      const slug = file.replace(/\.astro$/, '');
      const content = fs.readFileSync(path.join(categoryDir, file), 'utf-8');
      const title = extractTitle(content, slug);
      const keywords = extractKeywords(content);
      const clusterKey = extractMetadataValue(content, 'clusterKey') || deriveClusterKey(keywords[0] || slug);
      const intentClass = (extractMetadataValue(content, 'intentClass') as IntentClass | null) || determineIntentClass(keywords[0] || slug);
      const pageRole = (extractMetadataValue(content, 'pageRole') as PageRole | null) || determinePageRole(keywords[0] || slug, category);
      const robots = extractMetadataValue(content, 'robots');

      nodes.push({
        slug,
        url: `/${category}/${slug}`,
        title,
        category,
        clusterKey,
        intentClass,
        pageRole,
        robots,
        keywords,
      });
    }
  }

  return nodes;
}

function computeClusterCoverage(nodes: ContentNode[]): Map<string, number> {
  const coverage = new Map<string, number>();
  for (const node of nodes) {
    coverage.set(node.clusterKey, (coverage.get(node.clusterKey) || 0) + 1);
  }
  return coverage;
}

function overlapScore(a: string[], b: string[]): number {
  const setB = new Set(b.map(item => item.toLowerCase()));
  return a.reduce((total, item) => total + (setB.has(item.toLowerCase()) ? 1 : 0), 0);
}

export function suggestLinksForArticle(
  keyword: string,
  category: ArticleCategory,
  limit: number = 3
): LinkSuggestion[] {
  const nodes = collectContentGraph();
  const clusterKey = deriveClusterKey(keyword);
  const intent = determineIntentClass(keyword);
  const words = normalizeWords(keyword);

  const ranked = nodes
    .filter(node => !node.url.endsWith(`/${keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`))
    .map(node => {
      let score = 0;
      if (node.clusterKey === clusterKey) score += 10;
      if (node.category !== category) score += 4;
      if (node.pageRole === 'money') score += 3;
      if (intent === 'informational' && node.pageRole === 'money') score += 2;
      score += overlapScore(words, normalizeWords(`${node.title} ${node.keywords.join(' ')}`));

      return { node, score };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map(({ node }) => ({
    href: node.url,
    label: node.title,
    reason: node.clusterKey === clusterKey
      ? 'Same topic cluster'
      : node.pageRole === 'money'
        ? 'Commercial next step'
        : 'Supporting context',
    clusterKey: node.clusterKey,
    category: node.category,
  }));
}

export function rankKeywordCandidates(
  candidates: KeywordCandidate[],
  nodes: ContentNode[],
  limit: number
): RankedKeywordCandidate[] {
  const coverage = computeClusterCoverage(nodes);

  return candidates
    .map(candidate => {
      const category = determineCategoryFromKeyword(candidate.keyword);
      const intentClass = determineIntentClass(candidate.keyword);
      const pageRole = determinePageRole(candidate.keyword, category);
      const clusterKey = deriveClusterKey(candidate.keyword);
      const clusterCoverage = coverage.get(clusterKey) || 0;

      let score = (candidate.priority || 0) * 10 + Math.min(candidate.search_volume || 0, 5000) / 100;
      score += pageRole === 'money' ? 12 : pageRole === 'seed' ? 8 : 5;
      score += clusterCoverage === 0 ? 18 : clusterCoverage === 1 ? 12 : clusterCoverage === 2 ? 6 : 0;
      score += category === 'buy' ? 4 : category === 'wine-pairings' ? 3 : 2;

      return {
        ...candidate,
        category,
        intentClass,
        pageRole,
        clusterKey,
        clusterCoverage,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export interface RefreshCandidate {
  slug: string;
  category: ArticleCategory;
  url: string;
  clusterKey: string;
  score: number;
  issueTypes: string[];
  reasons: string[];
}

export function rankRefreshCandidates(
  scores: Array<{ slug: string; category: string; totalScore: number; issues: string[]; issueTypes?: string[]; metrics: { wordCount: number; internalLinkCount: number } }>,
  nodes: ContentNode[],
  limit: number
): RefreshCandidate[] {
  const coverage = computeClusterCoverage(nodes);
  return scores
    .map(score => {
      const node = nodes.find(entry => entry.slug === score.slug && entry.category === score.category);
      if (node?.robots?.includes('noindex')) return null;
      const reasons: string[] = [];
      const issueTypes = score.issueTypes || [];
      let priorityScore = 0;

      if (score.totalScore < 85) {
        reasons.push('Below current publish threshold');
        priorityScore += 30;
      }
      if (issueTypes.includes('word_count_low') || score.metrics.wordCount < 1200) {
        reasons.push('Thin content');
        priorityScore += 20;
      }
      if (issueTypes.includes('word_count_high')) {
        reasons.push('Overlong content');
        priorityScore += 18;
      }
      if (issueTypes.includes('weak_recommendations')) {
        reasons.push('Weak bottle support');
        priorityScore += 22;
      }
      if (issueTypes.includes('duplicate_content') || issueTypes.includes('topic_saturation')) {
        reasons.push('Needs duplication cleanup');
        priorityScore += 20;
      }
      if (issueTypes.includes('repetitive_structure') || issueTypes.includes('generic_intro')) {
        reasons.push('Needs editorial rewrite');
        priorityScore += 16;
      }
      if (issueTypes.includes('readability')) {
        reasons.push('Needs readability cleanup');
        priorityScore += 14;
      }
      if (issueTypes.includes('missing_internal_links') || score.metrics.internalLinkCount < 4) {
        reasons.push('Weak internal linking');
        priorityScore += 15;
      }
      if (node && (coverage.get(node.clusterKey) || 0) <= 2) {
        reasons.push('Underbuilt cluster');
        priorityScore += 10;
      }
      if (node?.pageRole === 'money') {
        reasons.push('Commercial page opportunity');
        priorityScore += 10;
      }

      return {
        slug: score.slug,
        category: score.category as ArticleCategory,
        url: `/${score.category}/${score.slug}`,
        clusterKey: node?.clusterKey || deriveClusterKey(score.slug),
        issueTypes,
        score: priorityScore,
        reasons,
      };
    })
    .filter((candidate): candidate is RefreshCandidate => candidate !== null && candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
