import { collectContentGraph } from '../lib/content-graph.js';
import { scoreArticleFiles, collectArticleFilePaths } from './qa-score-article.js';

interface DuplicateClusterRow {
  clusterKey: string;
  recommendation: 'keep-building' | 'refresh-before-expand' | 'review-consolidation';
  pages: Array<{
    slug: string;
    category: string;
    pageRole: string;
    intentClass: string;
    score: number | null;
  }>;
}

function recommendCluster(row: DuplicateClusterRow): DuplicateClusterRow['recommendation'] {
  const categories = new Set(row.pages.map(page => page.category));
  const lowScoreCount = row.pages.filter(page => (page.score ?? 0) < 80).length;
  const supportingOnly = row.pages.every(page => page.pageRole !== 'money');

  if (categories.size === 1 && lowScoreCount >= Math.ceil(row.pages.length / 2)) {
    return 'review-consolidation';
  }

  if (lowScoreCount > 0 || supportingOnly) {
    return 'refresh-before-expand';
  }

  return 'keep-building';
}

async function main(): Promise<void> {
  const nodes = collectContentGraph();
  const scores = await scoreArticleFiles(collectArticleFilePaths());
  const scoreMap = new Map(scores.map(score => [`${score.category}/${score.slug}`, score.totalScore]));
  const clusterMap = new Map<string, DuplicateClusterRow['pages']>();

  for (const node of nodes) {
    const pages = clusterMap.get(node.clusterKey) || [];
    pages.push({
      slug: node.slug,
      category: node.category,
      pageRole: node.pageRole,
      intentClass: node.intentClass,
      score: scoreMap.get(`${node.category}/${node.slug}`) ?? null,
    });
    clusterMap.set(node.clusterKey, pages);
  }

  const rows: DuplicateClusterRow[] = Array.from(clusterMap.entries())
    .filter(([, pages]) => pages.length > 1)
    .map(([clusterKey, pages]) => ({
      clusterKey,
      recommendation: 'keep-building',
      pages: pages.sort((a, b) => (a.score ?? 0) - (b.score ?? 0)),
    }))
    .map(row => ({ ...row, recommendation: recommendCluster(row) }))
    .sort((a, b) => {
      const order = {
        'review-consolidation': 0,
        'refresh-before-expand': 1,
        'keep-building': 2,
      } as const;
      return order[a.recommendation] - order[b.recommendation] || b.pages.length - a.pages.length;
    });

  console.log('\n🧭 Duplicate Cluster Report\n');
  if (rows.length === 0) {
    console.log('No duplicate clusters found.');
    return;
  }

  for (const row of rows) {
    console.log(`${row.clusterKey} :: ${row.recommendation}`);
    for (const page of row.pages) {
      console.log(`  - ${page.category}/${page.slug} | role=${page.pageRole} | intent=${page.intentClass} | qa=${page.score ?? 'n/a'}`);
    }
    console.log('');
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
