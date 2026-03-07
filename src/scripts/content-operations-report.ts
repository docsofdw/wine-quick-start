import { collectContentGraph, rankRefreshCandidates } from '../lib/content-graph.js';
import { scoreArticleFiles, collectArticleFilePaths } from './qa-score-article.js';

async function main() {
  console.log('🍷 Content Operations Report\n');

  const graph = collectContentGraph();
  const filePaths = collectArticleFilePaths();
  const scores = await scoreArticleFiles(filePaths);

  const clusterMap = new Map<string, { total: number; money: number; seed: number; supporting: number }>();
  for (const node of graph) {
    const current = clusterMap.get(node.clusterKey) || { total: 0, money: 0, seed: 0, supporting: 0 };
    current.total += 1;
    current[node.pageRole] += 1;
    clusterMap.set(node.clusterKey, current);
  }

  const underbuiltClusters = Array.from(clusterMap.entries())
    .map(([clusterKey, stats]) => ({ clusterKey, ...stats }))
    .filter(cluster => cluster.total <= 2 || cluster.money === 0)
    .sort((a, b) => a.total - b.total || a.money - b.money)
    .slice(0, 15);

  const refreshBacklog = rankRefreshCandidates(scores, graph, 15);
  const byCategory = new Map<string, number>();
  for (const node of graph) {
    byCategory.set(node.category, (byCategory.get(node.category) || 0) + 1);
  }

  console.log('📊 Inventory');
  for (const [category, count] of byCategory.entries()) {
    console.log(`   ${category}: ${count}`);
  }
  console.log(`   total: ${graph.length}`);

  console.log('\n🧩 Underbuilt Clusters');
  if (underbuiltClusters.length === 0) {
    console.log('   none');
  } else {
    for (const cluster of underbuiltClusters) {
      console.log(`   ${cluster.clusterKey}: total=${cluster.total}, seed=${cluster.seed}, supporting=${cluster.supporting}, money=${cluster.money}`);
    }
  }

  console.log('\n🔁 Refresh Backlog');
  if (refreshBacklog.length === 0) {
    console.log('   none');
  } else {
    for (const candidate of refreshBacklog) {
      console.log(`   ${candidate.category}/${candidate.slug} (${candidate.score}) - ${candidate.reasons.join(', ')}`);
    }
  }

  const scoreBuckets = {
    pass: scores.filter(score => score.totalScore >= 85).length,
    review: scores.filter(score => score.totalScore >= 60 && score.totalScore < 85).length,
    fail: scores.filter(score => score.totalScore < 60).length,
  };

  console.log('\n🧪 QA Distribution');
  console.log(`   pass: ${scoreBuckets.pass}`);
  console.log(`   review: ${scoreBuckets.review}`);
  console.log(`   fail: ${scoreBuckets.fail}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
