/**
 * Autonomous Content Pipeline
 *
 * Fully automated article generation, QA, enrichment, and publishing.
 * Designed to run unattended on a schedule (GitHub Actions / cron).
 *
 * Pipeline Steps:
 * 1. Generate new articles from priority keywords
 * 2. Score all new articles for quality
 * 3. Auto-enrich articles that scored below threshold
 * 4. Re-score enriched articles
 * 5. Publish passing articles, archive failing ones
 * 6. Log results and send summary notification
 *
 * Usage:
 *   npx tsx src/scripts/autonomous-pipeline.ts [options]
 *
 * Options:
 *   --dry-run           Preview without making changes
 *   --generate=N        Generate N new articles (default: 2)
 *   --enrich-limit=N    Max articles to enrich (default: 3)
 *   --skip-generate     Skip generation, only enrich existing
 *   --skip-enrich       Skip enrichment step
 *   --notify            Send Slack/email notification
 *   --verbose           Show detailed output
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { scoreArticle, scoreAllArticles, getScoreSummary, type QAScore } from './qa-score-article.js';
import { getWinesForKeyword, validateWinesInCatalog } from '../lib/wine-catalog.js';

config({ path: '.env.local', override: true });

// Parse CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const generateCountArg = args.find(a => a.startsWith('--generate='));
const generateCount = generateCountArg ? parseInt(generateCountArg.split('=')[1]) : 2;
const enrichLimitArg = args.find(a => a.startsWith('--enrich-limit='));
const enrichLimit = enrichLimitArg ? parseInt(enrichLimitArg.split('=')[1]) : 3;
const skipGenerate = args.includes('--skip-generate');
const skipEnrich = args.includes('--skip-enrich');
const sendNotification = args.includes('--notify');
const verbose = args.includes('--verbose');
const doValidateWines = args.includes('--validate-wines');

// Quality thresholds
const AUTO_PUBLISH_THRESHOLD = 80;
const NEEDS_ENRICHMENT_THRESHOLD = 70;
const REJECT_THRESHOLD = 50;

// Initialize clients
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const slackWebhook = process.env.SLACK_WEBHOOK_URL;

let anthropic: Anthropic | null = null;
let supabase: any = null;

if (anthropicKey) {
  anthropic = new Anthropic({ apiKey: anthropicKey });
}

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

interface PipelineResult {
  timestamp: string;
  generated: { slug: string; category: string; keyword: string }[];
  enriched: { slug: string; beforeScore: number; afterScore: number }[];
  published: { slug: string; score: number }[];
  rejected: { slug: string; score: number; reason: string }[];
  skipped: { slug: string; reason: string }[];
  flaggedWines: { slug: string; invalidWines: string[] }[];  // NEW: Articles with invalid wines
  errors: string[];
  summary: {
    totalProcessed: number;
    newArticles: number;
    enrichedArticles: number;
    publishedArticles: number;
    rejectedArticles: number;
    flaggedWineArticles: number;  // NEW
    avgScore: number;
  };
}

/**
 * Logger utility
 */
function log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') {
  const icons = { info: '📋', warn: '⚠️', error: '❌', success: '✅' };
  console.log(`${icons[level]} ${message}`);
}

function debug(message: string) {
  if (verbose) {
    console.log(`   🔍 ${message}`);
  }
}

/**
 * Get high-priority keywords that need articles
 */
async function getKeywordsNeedingArticles(limit: number): Promise<any[]> {
  if (!supabase) {
    log('Supabase not configured, using fallback keywords', 'warn');
    return [];
  }

  try {
    const { data: keywords, error } = await supabase
      .from('keyword_opportunities')
      .select('*')
      .eq('status', 'active')
      .gte('priority', 7)
      .order('priority', { ascending: false })
      .order('search_volume', { ascending: false })
      .limit(limit * 2); // Get extras in case some are duplicates

    if (error) throw error;
    return keywords || [];
  } catch (err: any) {
    log(`Failed to fetch keywords: ${err.message}`, 'error');
    return [];
  }
}

/**
 * Check if an article already exists
 */
function articleExists(slug: string): boolean {
  const pagesDir = path.join(process.cwd(), 'src/pages');
  for (const cat of ['learn', 'wine-pairings', 'buy']) {
    if (fs.existsSync(path.join(pagesDir, cat, `${slug}.astro`))) {
      return true;
    }
  }
  return false;
}

/**
 * Generate a single article (simplified version of generate-priority-articles)
 */
async function generateArticle(keyword: any, result: PipelineResult): Promise<string | null> {
  const slug = keyword.keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (articleExists(slug)) {
    result.skipped.push({ slug, reason: 'Article already exists' });
    debug(`Skipping ${slug} - already exists`);
    return null;
  }

  // Determine category
  const kw = keyword.keyword.toLowerCase();
  let category: 'learn' | 'wine-pairings' | 'buy' = 'learn';
  if (kw.includes('pairing') || kw.includes('with ') || kw.includes('food')) {
    category = 'wine-pairings';
  } else if (kw.includes('buy') || kw.includes('price') || kw.includes('under $') || kw.includes('budget')) {
    category = 'buy';
  }

  if (isDryRun) {
    log(`[DRY RUN] Would generate: ${category}/${slug}`, 'info');
    result.generated.push({ slug, category, keyword: keyword.keyword });
    return slug;
  }

  try {
    // Import and run the generation logic
    const { spawn } = await import('child_process');

    return new Promise((resolve, reject) => {
      const proc = spawn('npx', [
        'tsx',
        'src/scripts/generate-priority-articles.ts',
        '--limit=1',
        `--min-priority=${keyword.priority || 7}`,
      ], {
        cwd: process.cwd(),
        stdio: verbose ? 'inherit' : 'pipe',
      });

      proc.on('close', (code) => {
        if (code === 0) {
          result.generated.push({ slug, category, keyword: keyword.keyword });
          resolve(slug);
        } else {
          result.errors.push(`Generation failed for ${keyword.keyword}`);
          resolve(null);
        }
      });

      proc.on('error', (err) => {
        result.errors.push(`Generation error: ${err.message}`);
        resolve(null);
      });
    });
  } catch (err: any) {
    result.errors.push(`Failed to generate ${keyword.keyword}: ${err.message}`);
    return null;
  }
}

/**
 * Enrich an article to improve its score
 */
async function enrichArticle(score: QAScore, result: PipelineResult): Promise<number> {
  const beforeScore = score.totalScore;

  if (isDryRun) {
    log(`[DRY RUN] Would enrich: ${score.category}/${score.slug} (score: ${beforeScore})`, 'info');
    const estimatedAfter = Math.min(95, beforeScore + 15);
    result.enriched.push({ slug: score.slug, beforeScore, afterScore: estimatedAfter });
    return estimatedAfter;
  }

  try {
    const { spawn } = await import('child_process');

    return new Promise((resolve) => {
      const proc = spawn('npx', [
        'tsx',
        'src/scripts/enrich-articles.ts',
        `--article=${score.slug}`,
        '--limit=1',
      ], {
        cwd: process.cwd(),
        stdio: verbose ? 'inherit' : 'pipe',
      });

      proc.on('close', (code) => {
        if (code === 0) {
          // Re-score after enrichment
          try {
            const newScore = scoreArticle(score.filePath);
            result.enriched.push({
              slug: score.slug,
              beforeScore,
              afterScore: newScore.totalScore,
            });
            resolve(newScore.totalScore);
          } catch (err) {
            resolve(beforeScore);
          }
        } else {
          result.errors.push(`Enrichment failed for ${score.slug}`);
          resolve(beforeScore);
        }
      });

      proc.on('error', (err) => {
        result.errors.push(`Enrichment error: ${err.message}`);
        resolve(beforeScore);
      });
    });
  } catch (err: any) {
    result.errors.push(`Failed to enrich ${score.slug}: ${err.message}`);
    return beforeScore;
  }
}

/**
 * Mark a keyword as used in the database
 */
async function markKeywordUsed(keyword: string): Promise<void> {
  if (!supabase || isDryRun) return;

  try {
    await supabase
      .from('keyword_opportunities')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('keyword', keyword);
  } catch (err: any) {
    debug(`Failed to mark keyword as used: ${err.message}`);
  }
}

/**
 * Archive a rejected article
 */
function archiveRejectedArticle(score: QAScore, reason: string): void {
  if (isDryRun) {
    log(`[DRY RUN] Would archive: ${score.slug} (reason: ${reason})`, 'warn');
    return;
  }

  const archiveDir = path.join(process.cwd(), 'src/archived-articles');
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  const archivePath = path.join(archiveDir, `${score.slug}.astro`);
  const content = fs.readFileSync(score.filePath, 'utf-8');

  // Add rejection metadata
  const archiveContent = `<!--
ARCHIVED: ${new Date().toISOString()}
REASON: ${reason}
SCORE: ${score.totalScore}
ISSUES: ${score.issues.join(', ')}
-->
${content}`;

  fs.writeFileSync(archivePath, archiveContent);
  fs.unlinkSync(score.filePath);

  log(`Archived: ${score.slug} (${reason})`, 'warn');
}

/**
 * Send notification (Slack webhook)
 */
async function sendNotificationSummary(result: PipelineResult): Promise<void> {
  if (!slackWebhook) {
    debug('No Slack webhook configured, skipping notification');
    return;
  }

  const summary = result.summary;
  const statusEmoji = summary.rejectedArticles > 0 ? '⚠️' : '✅';

  const message = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} Wine Content Pipeline Report`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*New Articles:*\n${summary.newArticles}` },
          { type: 'mrkdwn', text: `*Enriched:*\n${summary.enrichedArticles}` },
          { type: 'mrkdwn', text: `*Published:*\n${summary.publishedArticles}` },
          { type: 'mrkdwn', text: `*Rejected:*\n${summary.rejectedArticles}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Average Quality Score:* ${summary.avgScore}%${summary.flaggedWineArticles > 0 ? `\n⚠️ *Wine Validation Issues:* ${summary.flaggedWineArticles} article(s)` : ''}`,
        },
      },
    ],
  };

  if (result.errors.length > 0) {
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Errors:*\n${result.errors.slice(0, 3).join('\n')}`,
      },
    });
  }

  try {
    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    log('Notification sent to Slack', 'success');
  } catch (err: any) {
    log(`Failed to send notification: ${err.message}`, 'error');
  }
}

/**
 * Log results to file for tracking
 */
function logResults(result: PipelineResult): void {
  const logsDir = path.join(process.cwd(), 'pipeline-logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logFile = path.join(logsDir, `${result.timestamp.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(logFile, JSON.stringify(result, null, 2));

  debug(`Results logged to ${logFile}`);
}

/**
 * Main pipeline execution
 */
async function runPipeline(): Promise<PipelineResult> {
  const result: PipelineResult = {
    timestamp: new Date().toISOString(),
    generated: [],
    enriched: [],
    published: [],
    rejected: [],
    skipped: [],
    flaggedWines: [],
    errors: [],
    summary: {
      totalProcessed: 0,
      newArticles: 0,
      enrichedArticles: 0,
      publishedArticles: 0,
      rejectedArticles: 0,
      flaggedWineArticles: 0,
      avgScore: 0,
    },
  };

  console.log('\n' + '═'.repeat(60));
  console.log('🍷 AUTONOMOUS CONTENT PIPELINE');
  console.log('═'.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Generate: ${skipGenerate ? 'SKIP' : generateCount + ' articles'}`);
  console.log(`Enrich: ${skipEnrich ? 'SKIP' : 'up to ' + enrichLimit + ' articles'}`);
  console.log(`Wine Validation: ${doValidateWines ? 'ENABLED' : 'DISABLED'}`);
  console.log('═'.repeat(60) + '\n');

  // Step 1: Generate new articles
  if (!skipGenerate) {
    log('STEP 1: Generating new articles...', 'info');

    const keywords = await getKeywordsNeedingArticles(generateCount);

    if (keywords.length === 0) {
      log('No keywords available for generation', 'warn');
    } else {
      let generated = 0;
      for (const keyword of keywords) {
        if (generated >= generateCount) break;

        // PRE-GENERATION WINE CHECK: Verify wines exist in catalog
        if (doValidateWines) {
          try {
            debug(`Checking wine catalog for "${keyword.keyword}"...`);
            const wines = await getWinesForKeyword(keyword.keyword, 3);
            if (wines.length === 0) {
              const slug = keyword.keyword
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
              result.skipped.push({ slug, reason: 'No matching wines in catalog' });
              log(`Skipping "${keyword.keyword}" - no matching wines in catalog`, 'warn');
              continue;
            }
            debug(`Found ${wines.length} matching wines for "${keyword.keyword}"`);
          } catch (err: any) {
            debug(`Wine check failed: ${err.message} - proceeding anyway`);
          }
        }

        const slug = await generateArticle(keyword, result);
        if (slug) {
          await markKeywordUsed(keyword.keyword);
          generated++;
        }

        // Rate limit between generations
        if (generated < generateCount) {
          debug('Waiting 5s before next generation...');
          await new Promise(r => setTimeout(r, 5000));
        }
      }

      log(`Generated ${result.generated.length} new articles`, 'success');
    }
  } else {
    log('STEP 1: Skipping generation', 'info');
  }

  // Step 2: Score all recent articles
  log('\nSTEP 2: Scoring articles...', 'info');

  const allScores = await scoreAllArticles();
  const scoreSummary = getScoreSummary(allScores);

  log(`Scored ${allScores.length} articles (avg: ${scoreSummary.avgScore}%)`, 'info');
  debug(`Pass: ${scoreSummary.passed}, Review: ${scoreSummary.review}, Fail: ${scoreSummary.failed}`);

  // Step 3: Enrich articles that need it
  if (!skipEnrich) {
    log('\nSTEP 3: Enriching low-scoring articles...', 'info');

    const needsEnrichment = allScores
      .filter(s => s.totalScore < AUTO_PUBLISH_THRESHOLD && s.totalScore >= REJECT_THRESHOLD)
      .sort((a, b) => a.totalScore - b.totalScore)
      .slice(0, enrichLimit);

    if (needsEnrichment.length === 0) {
      log('No articles need enrichment', 'success');
    } else {
      for (const score of needsEnrichment) {
        log(`Enriching: ${score.slug} (score: ${score.totalScore})`, 'info');
        await enrichArticle(score, result);

        // POST-ENRICHMENT WINE VALIDATION
        if (doValidateWines) {
          try {
            debug(`Validating wines in enriched article "${score.slug}"...`);
            const newScore = await scoreArticle(score.filePath, true);
            if (newScore.metrics.invalidWines && newScore.metrics.invalidWines.length > 0) {
              result.flaggedWines.push({
                slug: score.slug,
                invalidWines: newScore.metrics.invalidWines,
              });
              log(`⚠️  Article "${score.slug}" has ${newScore.metrics.invalidWines.length} invalid wines`, 'warn');
            }
          } catch (err: any) {
            debug(`Wine validation failed: ${err.message}`);
          }
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 5000));
      }

      log(`Enriched ${result.enriched.length} articles`, 'success');
    }
  } else {
    log('\nSTEP 3: Skipping enrichment', 'info');
  }

  // Step 4: Re-score and categorize
  log('\nSTEP 4: Final scoring and publishing decisions...', 'info');

  const finalScores = await scoreAllArticles(undefined, doValidateWines);

  for (const score of finalScores) {
    // Check for invalid wines
    if (doValidateWines && score.metrics.invalidWines && score.metrics.invalidWines.length > 0) {
      // Check if already flagged
      const alreadyFlagged = result.flaggedWines.some(f => f.slug === score.slug);
      if (!alreadyFlagged) {
        result.flaggedWines.push({
          slug: score.slug,
          invalidWines: score.metrics.invalidWines,
        });
      }
    }

    if (score.totalScore >= AUTO_PUBLISH_THRESHOLD) {
      result.published.push({ slug: score.slug, score: score.totalScore });
      debug(`✅ ${score.slug}: PUBLISH (${score.totalScore}%)`);
    } else if (score.totalScore < REJECT_THRESHOLD) {
      const reason = score.issues.slice(0, 2).join('; ');
      result.rejected.push({ slug: score.slug, score: score.totalScore, reason });

      // Archive rejected articles (optional - uncomment to enable)
      // archiveRejectedArticle(score, reason);

      debug(`❌ ${score.slug}: REJECT (${score.totalScore}%) - ${reason}`);
    } else {
      // Between thresholds - keep but flag
      debug(`⚠️ ${score.slug}: REVIEW NEEDED (${score.totalScore}%)`);
    }
  }

  // Calculate summary
  result.summary = {
    totalProcessed: finalScores.length,
    newArticles: result.generated.length,
    enrichedArticles: result.enriched.length,
    publishedArticles: result.published.length,
    rejectedArticles: result.rejected.length,
    flaggedWineArticles: result.flaggedWines.length,
    avgScore: getScoreSummary(finalScores).avgScore,
  };

  // Log results
  if (!isDryRun) {
    logResults(result);
  }

  // Send notification if requested
  if (sendNotification) {
    await sendNotificationSummary(result);
  }

  return result;
}

/**
 * Print final summary
 */
function printSummary(result: PipelineResult) {
  console.log('\n' + '═'.repeat(60));
  console.log('📋 PIPELINE SUMMARY');
  console.log('═'.repeat(60));

  console.log(`\n📊 Results:`);
  console.log(`   New articles generated: ${result.summary.newArticles}`);
  console.log(`   Articles enriched:      ${result.summary.enrichedArticles}`);
  console.log(`   Ready to publish:       ${result.summary.publishedArticles}`);
  console.log(`   Rejected (low quality): ${result.summary.rejectedArticles}`);
  console.log(`   Average quality score:  ${result.summary.avgScore}%`);

  if (result.published.length > 0) {
    console.log(`\n✅ PUBLISHED (${AUTO_PUBLISH_THRESHOLD}%+ score):`);
    for (const p of result.published.slice(0, 10)) {
      console.log(`   ${p.slug} (${p.score}%)`);
    }
    if (result.published.length > 10) {
      console.log(`   ... and ${result.published.length - 10} more`);
    }
  }

  if (result.rejected.length > 0) {
    console.log(`\n❌ REJECTED (<${REJECT_THRESHOLD}% score):`);
    for (const r of result.rejected) {
      console.log(`   ${r.slug} (${r.score}%) - ${r.reason}`);
    }
  }

  if (result.errors.length > 0) {
    console.log(`\n⚠️ ERRORS:`);
    for (const e of result.errors) {
      console.log(`   ${e}`);
    }
  }

  if (result.enriched.length > 0) {
    console.log(`\n📈 ENRICHMENT IMPACT:`);
    for (const e of result.enriched) {
      const delta = e.afterScore - e.beforeScore;
      const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
      console.log(`   ${e.slug}: ${e.beforeScore}% ${arrow} ${e.afterScore}% (${delta > 0 ? '+' : ''}${delta})`);
    }
  }

  if (result.flaggedWines.length > 0) {
    console.log(`\n🍷 WINE VALIDATION ISSUES:`);
    for (const f of result.flaggedWines) {
      console.log(`   ${f.slug}: ${f.invalidWines.length} invalid wine(s)`);
      for (const wine of f.invalidWines.slice(0, 3)) {
        console.log(`      - ${wine}`);
      }
      if (f.invalidWines.length > 3) {
        console.log(`      ... and ${f.invalidWines.length - 3} more`);
      }
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(isDryRun ? '🔍 DRY RUN COMPLETE - No changes made' : '✅ PIPELINE COMPLETE');
  console.log('═'.repeat(60) + '\n');
}

// Main execution
runPipeline()
  .then(printSummary)
  .catch((err) => {
    console.error('Pipeline failed:', err);
    process.exit(1);
  });
