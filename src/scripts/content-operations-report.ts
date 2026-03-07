import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { collectContentGraph, rankRefreshCandidates } from '../lib/content-graph.js';
import { scoreArticleFiles, collectArticleFilePaths } from './qa-score-article.js';

config({ path: '.env.local', override: true });

const args = process.argv.slice(2);
const outputJson = args.includes('--json');
const writeSnapshot = args.includes('--write-snapshot');
const persistSnapshot = args.includes('--persist');

export interface ContentOperationsSnapshot {
  timestamp: string;
  runIdentifier: string;
  triggerType: string;
  inventory: {
    total: number;
    byCategory: Record<string, number>;
  };
  underbuiltClusters: Array<{ clusterKey: string; total: number; money: number; seed: number; supporting: number }>;
  refreshBacklog: Array<{ slug: string; category: string; score: number; reasons: string[]; clusterKey: string }>;
  qaDistribution: {
    pass: number;
    review: number;
    fail: number;
  };
}

function isMissingSnapshotsTable(error: any): boolean {
  const message = String(error?.message || error || '');
  return /content_operation_snapshots|relation .* does not exist/i.test(message);
}

export async function generateOperationsSnapshot(): Promise<ContentOperationsSnapshot> {
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

  const qaDistribution = {
    pass: scores.filter(score => score.totalScore >= 85).length,
    review: scores.filter(score => score.totalScore >= 60 && score.totalScore < 85).length,
    fail: scores.filter(score => score.totalScore < 60).length,
  };

  return {
    timestamp: new Date().toISOString(),
    runIdentifier: process.env.GITHUB_RUN_ID || `local-${Date.now()}`,
    triggerType: process.env.GITHUB_EVENT_NAME || 'manual',
    inventory: {
      total: graph.length,
      byCategory: Object.fromEntries(byCategory.entries()),
    },
    underbuiltClusters,
    refreshBacklog: refreshBacklog.map(candidate => ({
      slug: candidate.slug,
      category: candidate.category,
      score: candidate.score,
      reasons: candidate.reasons,
      clusterKey: candidate.clusterKey,
    })),
    qaDistribution,
  };
}

function printSnapshot(snapshot: ContentOperationsSnapshot): void {
  console.log('🍷 Content Operations Report\n');
  console.log('📊 Inventory');
  for (const [category, count] of Object.entries(snapshot.inventory.byCategory)) {
    console.log(`   ${category}: ${count}`);
  }
  console.log(`   total: ${snapshot.inventory.total}`);

  console.log('\n🧩 Underbuilt Clusters');
  if (snapshot.underbuiltClusters.length === 0) {
    console.log('   none');
  } else {
    for (const cluster of snapshot.underbuiltClusters) {
      console.log(`   ${cluster.clusterKey}: total=${cluster.total}, seed=${cluster.seed}, supporting=${cluster.supporting}, money=${cluster.money}`);
    }
  }

  console.log('\n🔁 Refresh Backlog');
  if (snapshot.refreshBacklog.length === 0) {
    console.log('   none');
  } else {
    for (const candidate of snapshot.refreshBacklog) {
      console.log(`   ${candidate.category}/${candidate.slug} (${candidate.score}) - ${candidate.reasons.join(', ')}`);
    }
  }

  console.log('\n🧪 QA Distribution');
  console.log(`   pass: ${snapshot.qaDistribution.pass}`);
  console.log(`   review: ${snapshot.qaDistribution.review}`);
  console.log(`   fail: ${snapshot.qaDistribution.fail}`);
}

function writeSnapshotToDisk(snapshot: ContentOperationsSnapshot): string {
  const logsDir = path.join(process.cwd(), 'pipeline-logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const filePath = path.join(logsDir, `content-ops-${snapshot.timestamp.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
  return filePath;
}

async function persistSnapshotToSupabase(snapshot: ContentOperationsSnapshot): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return;

  const supabase = createClient(url, key);
  try {
    const { error } = await supabase
      .from('content_operation_snapshots')
      .insert({
        run_identifier: snapshot.runIdentifier,
        trigger_type: snapshot.triggerType,
        inventory_total: snapshot.inventory.total,
        inventory_by_category: snapshot.inventory.byCategory,
        underbuilt_clusters: snapshot.underbuiltClusters,
        refresh_backlog: snapshot.refreshBacklog,
        qa_distribution: snapshot.qaDistribution,
        snapshot_json: snapshot,
        created_at: snapshot.timestamp,
      });

    if (error) throw error;
  } catch (error: any) {
    if (isMissingSnapshotsTable(error)) {
      console.log('ℹ️ content_operation_snapshots table is not present yet; snapshot persisted only to logs');
      return;
    }
    throw error;
  }
}

async function main() {
  const snapshot = await generateOperationsSnapshot();

  if (outputJson) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  printSnapshot(snapshot);

  if (writeSnapshot) {
    const filePath = writeSnapshotToDisk(snapshot);
    console.log(`\n📝 Snapshot written: ${path.relative(process.cwd(), filePath)}`);
  }

  if (persistSnapshot) {
    await persistSnapshotToSupabase(snapshot);
    console.log('💾 Snapshot persistence attempted');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
