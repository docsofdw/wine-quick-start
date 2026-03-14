import { config } from 'dotenv';
import { collectContentGraph } from '../lib/content-graph.js';
import { loadLatestSearchPerformanceByUrl, normalizePagePath } from '../lib/search-console.js';

config({ path: '.env.local', override: true });

const args = process.argv.slice(2);
const outputJson = args.includes('--json');

interface OpportunityRow {
  url: string;
  title: string;
  category: string;
  clusterKey: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
  reason: string;
}

async function main() {
  const graph = collectContentGraph();
  const performanceByUrl = await loadLatestSearchPerformanceByUrl();

  const rows: OpportunityRow[] = graph
    .filter(node => !node.robots?.includes('noindex'))
    .map(node => {
      const metrics = performanceByUrl.get(normalizePagePath(node.url));
      if (!metrics) return null;

      let reason = '';
      if (metrics.impressions >= 150 && (metrics.ctr ?? 0) < 0.03) {
        reason = 'high_impression_low_ctr';
      } else if (metrics.position !== null && metrics.position >= 5 && metrics.position <= 20) {
        reason = 'near_page_one';
      } else if (metrics.clicks >= 10) {
        reason = 'existing_traction';
      }

      if (!reason) return null;

      return {
        url: node.url,
        title: node.title,
        category: node.category,
        clusterKey: node.clusterKey,
        clicks: metrics.clicks,
        impressions: metrics.impressions,
        ctr: metrics.ctr,
        position: metrics.position,
        reason,
      };
    })
    .filter((row): row is OpportunityRow => row !== null)
    .sort((a, b) => {
      if (a.reason !== b.reason) return a.reason.localeCompare(b.reason);
      return b.impressions - a.impressions;
    });

  if (outputJson) {
    console.log(JSON.stringify({ total: rows.length, rows }, null, 2));
    return;
  }

  console.log('📈 Search Performance Opportunities\n');
  if (rows.length === 0) {
    console.log('No Search Console performance opportunities found. Import page metrics first.');
    return;
  }

  for (const row of rows.slice(0, 25)) {
    console.log(`${row.reason} :: ${row.url}`);
    console.log(`   title=${row.title}`);
    console.log(`   category=${row.category} cluster=${row.clusterKey}`);
    console.log(`   impressions=${row.impressions} clicks=${row.clicks} ctr=${row.ctr ?? 'null'} position=${row.position ?? 'null'}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
