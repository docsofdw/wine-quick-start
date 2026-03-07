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
 *   --full-scan         Score all articles (default: incremental)
 *   --notify            Send Slack/email notification
 *   --verbose           Show detailed output
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import {
  scoreArticle,
  scoreArticleFiles,
  collectArticleFilePaths,
  getScoreSummary,
  type QAScore,
} from './qa-score-article.js';
import { getWinesForKeyword } from '../lib/wine-catalog.js';
import {
  collectContentGraph,
  rankKeywordCandidates,
  rankRefreshCandidates,
  type RankedKeywordCandidate,
} from '../lib/content-graph.js';

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
const fullScan = args.includes('--full-scan');
const refreshOnly = args.includes('--refresh-only');
const refreshLimitArg = args.find(a => a.startsWith('--refresh-limit='));
const refreshLimit = refreshLimitArg ? parseInt(refreshLimitArg.split('=')[1]) : enrichLimit;
const generateTimeoutMs = parseInt(process.env.PIPELINE_GENERATE_TIMEOUT_MS || '720000', 10);
const enrichTimeoutMs = parseInt(process.env.PIPELINE_ENRICH_TIMEOUT_MS || '720000', 10);

// Quality thresholds
const AUTO_PUBLISH_THRESHOLD = 85;  // Raised from 80 for higher quality
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
  remediatedWines: { slug: string; fixed: boolean; reason?: string }[];
  refreshTargets: { slug: string; category: string; reasons: string[]; priorityScore: number }[];
  errors: string[];
  runRecordId?: number | null;
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

interface PipelineArticleOutcomeRecord {
  slug: string;
  keyword: string | null;
  category: string | null;
  outcome: 'generated' | 'skipped' | 'publish_ready' | 'rejected' | 'enriched' | 'flagged_wines' | 'wine_remediated';
  reason?: string | null;
  qaScore?: number | null;
  metadata?: Record<string, unknown> | null;
}

const runIdentifier = process.env.GITHUB_RUN_ID || `local-${Date.now()}`;
const triggerType = process.env.GITHUB_EVENT_NAME || (isDryRun ? 'dry_run' : 'manual');
let pipelineTrackingDisabled = false;
let activePipelineResult: PipelineResult | null = null;

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

async function runSubprocessWithTimeout(
  commandArgs: string[],
  timeoutMs: number,
  stage: 'generation' | 'enrichment',
  target: string,
  result: PipelineResult
): Promise<number | null> {
  const { spawn } = await import('child_process');

  return new Promise((resolve) => {
    const proc = spawn('npx', commandArgs, {
      cwd: process.cwd(),
      stdio: verbose ? 'inherit' : 'pipe',
    });

    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill('SIGTERM');
      result.errors.push(`${stage} timed out for ${target} after ${Math.round(timeoutMs / 1000)}s`);
      debug(`Timed out ${stage} for ${target}`);
      resolve(null);
    }, timeoutMs);

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(code ?? null);
    });

    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      result.errors.push(`${stage} error for ${target}: ${err.message}`);
      resolve(null);
    });
  });
}

function isMissingTrackingTable(error: any): boolean {
  const message = String(error?.message || error || '');
  return /pipeline_runs|pipeline_article_outcomes|relation .* does not exist/i.test(message);
}

async function createPipelineRunRecord(): Promise<number | null> {
  if (!supabase || isDryRun || pipelineTrackingDisabled) return null;

  const payload = {
    run_identifier: runIdentifier,
    trigger_type: triggerType,
    run_mode: isDryRun ? 'dry_run' : 'live',
    status: 'running',
    started_at: new Date().toISOString(),
    config: {
      generateCount,
      enrichLimit,
      skipGenerate,
      skipEnrich,
      fullScan,
      validateWines: doValidateWines,
    },
    commit_sha: process.env.GITHUB_SHA || null,
    source_branch: process.env.GITHUB_REF_NAME || null,
  };

  try {
    const { data, error } = await supabase
      .from('pipeline_runs')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;
    return data?.id ?? null;
  } catch (error: any) {
    if (isMissingTrackingTable(error)) {
      pipelineTrackingDisabled = true;
      debug('Pipeline tracking tables are not present yet; continuing without durable run tracking');
      return null;
    }

    debug(`Failed to create pipeline run record: ${error.message}`);
    return null;
  }
}

async function updatePipelineRunRecord(runRecordId: number | null, result: PipelineResult, status: 'completed' | 'failed'): Promise<void> {
  if (!supabase || isDryRun || !runRecordId || pipelineTrackingDisabled) return;

  try {
    const { error } = await supabase
      .from('pipeline_runs')
      .update({
        status,
        completed_at: new Date().toISOString(),
        generated_articles: result.summary.newArticles,
        enriched_articles: result.summary.enrichedArticles,
        publish_ready_articles: result.summary.publishedArticles,
        rejected_articles: result.summary.rejectedArticles,
        flagged_wine_articles: result.summary.flaggedWineArticles,
        avg_score: result.summary.avgScore,
        error_count: result.errors.length,
        result_json: result,
      })
      .eq('id', runRecordId);

    if (error) throw error;
  } catch (error: any) {
    if (isMissingTrackingTable(error)) {
      pipelineTrackingDisabled = true;
      debug('Pipeline tracking tables are not present yet; skipping run update');
      return;
    }

    debug(`Failed to update pipeline run record: ${error.message}`);
  }
}

function buildArticleOutcomeRecords(result: PipelineResult): PipelineArticleOutcomeRecord[] {
  const records: PipelineArticleOutcomeRecord[] = [];

  for (const article of result.generated) {
    records.push({
      slug: article.slug,
      keyword: article.keyword,
      category: article.category,
      outcome: 'generated',
    });
  }

  for (const article of result.enriched) {
    records.push({
      slug: article.slug,
      keyword: null,
      category: null,
      outcome: 'enriched',
      metadata: {
        beforeScore: article.beforeScore,
        afterScore: article.afterScore,
      },
    });
  }

  for (const article of result.published) {
    const generatedMatch = result.generated.find(g => g.slug === article.slug);
    records.push({
      slug: article.slug,
      keyword: generatedMatch?.keyword || null,
      category: generatedMatch?.category || null,
      outcome: 'publish_ready',
      qaScore: article.score,
    });
  }

  for (const article of result.rejected) {
    records.push({
      slug: article.slug,
      keyword: null,
      category: null,
      outcome: 'rejected',
      reason: article.reason,
      qaScore: article.score,
    });
  }

  for (const article of result.skipped) {
    records.push({
      slug: article.slug,
      keyword: result.generated.find(g => g.slug === article.slug)?.keyword || null,
      category: result.generated.find(g => g.slug === article.slug)?.category || null,
      outcome: 'skipped',
      reason: article.reason,
    });
  }

  for (const article of result.flaggedWines) {
    records.push({
      slug: article.slug,
      keyword: null,
      category: null,
      outcome: 'flagged_wines',
      metadata: {
        invalidWines: article.invalidWines,
      },
    });
  }

  for (const article of result.remediatedWines) {
    records.push({
      slug: article.slug,
      keyword: null,
      category: null,
      outcome: 'wine_remediated',
      reason: article.reason || null,
      metadata: {
        fixed: article.fixed,
      },
    });
  }

  return records;
}

async function insertArticleOutcomeRecords(runRecordId: number | null, result: PipelineResult): Promise<void> {
  if (!supabase || isDryRun || !runRecordId || pipelineTrackingDisabled) return;

  const records = buildArticleOutcomeRecords(result);
  if (records.length === 0) return;

  try {
    const payload = records.map(record => ({
      pipeline_run_id: runRecordId,
      run_identifier: runIdentifier,
      slug: record.slug,
      keyword: record.keyword,
      category: record.category,
      outcome: record.outcome,
      reason: record.reason || null,
      qa_score: record.qaScore || null,
      metadata: record.metadata || null,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('pipeline_article_outcomes')
      .insert(payload);

    if (error) throw error;
  } catch (error: any) {
    if (isMissingTrackingTable(error)) {
      pipelineTrackingDisabled = true;
      debug('Pipeline tracking tables are not present yet; skipping article outcome tracking');
      return;
    }

    debug(`Failed to insert article outcome records: ${error.message}`);
  }
}

async function remediateFlaggedWineArticle(
  slug: string,
  category: string,
  result: PipelineResult
): Promise<boolean> {
  const code = await runSubprocessWithTimeout(
    [
      'tsx',
      'src/scripts/refresh-article-wines.ts',
      '--write',
      `--category=${category}`,
      `--slug=${slug}`,
      '--limit=1',
    ],
    enrichTimeoutMs,
    'enrichment',
    `wine-remediation:${category}/${slug}`,
    result
  );

  if (code === 0) {
    result.remediatedWines.push({ slug, fixed: true });
    return true;
  }

  result.remediatedWines.push({
    slug,
    fixed: false,
    reason: code === null ? 'Timed out during remediation' : 'Remediation script failed',
  });
  return false;
}

/**
 * Get high-priority keywords that need articles
 */
async function getKeywordsNeedingArticles(limit: number): Promise<RankedKeywordCandidate[]> {
  if (!supabase) {
    log('Supabase not configured, using fallback keywords', 'warn');
    return [];
  }

  try {
    const fetchLimit = Math.max(limit * 20, 50);
    const { data: keywords, error } = await supabase
      .from('keyword_opportunities')
      .select('*')
      .or('status.is.null,status.eq.active')
      .gte('priority', 7)
      .order('priority', { ascending: false })
      .order('search_volume', { ascending: false })
      .limit(fetchLimit); // Pull a wider candidate pool because many keywords fail wine matching

    if (error) throw error;
    const graph = collectContentGraph();
    return rankKeywordCandidates(keywords || [], graph, limit * 4);
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
  const expectedFilePath = path.join(process.cwd(), 'src/pages', category, `${slug}.astro`);

  if (isDryRun) {
    log(`[DRY RUN] Would generate: ${category}/${slug}`, 'info');
    result.generated.push({ slug, category, keyword: keyword.keyword });
    return slug;
  }

  try {
    const code = await runSubprocessWithTimeout(
      [
        'tsx',
        'src/scripts/generate-priority-articles.ts',
        '--limit=1',
        `--keyword=${keyword.keyword}`,
        '--no-mark-used',
      ],
      generateTimeoutMs,
      'generation',
      keyword.keyword,
      result
    );

    const fileExists = fs.existsSync(expectedFilePath);
    if (code === 0 && fileExists) {
      result.generated.push({ slug, category, keyword: keyword.keyword });
      return slug;
    }
    if (code === 0 && !fileExists) {
      result.errors.push(
        `Generation reported success but expected file missing for "${keyword.keyword}" (${category}/${slug}.astro)`
      );
      return null;
    }
    if (code === null) {
      return null;
    }

    result.errors.push(`Generation failed for ${keyword.keyword}`);
    return null;
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
    const code = await runSubprocessWithTimeout(
      [
        'tsx',
        'src/scripts/enrich-articles.ts',
        `--article=${score.slug}`,
        '--limit=1',
      ],
      enrichTimeoutMs,
      'enrichment',
      score.slug,
      result
    );

    if (code === 0) {
      try {
        const newScore = await scoreArticle(score.filePath);
        result.enriched.push({
          slug: score.slug,
          beforeScore,
          afterScore: newScore.totalScore,
        });
        return newScore.totalScore;
      } catch (err) {
        return beforeScore;
      }
    }

    if (code !== null) {
      result.errors.push(`Enrichment failed for ${score.slug}`);
    }
    return beforeScore;
  } catch (err: any) {
    result.errors.push(`Failed to enrich ${score.slug}: ${err.message}`);
    return beforeScore;
  }
}

/**
 * Mark a keyword as used in the database
 */
async function markKeywordUsed(keyword: string): Promise<boolean> {
  if (!supabase || isDryRun) return true;

  try {
    const { data, error } = await supabase
      .from('keyword_opportunities')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('keyword', keyword)
      .select('keyword');

    if (error) {
      debug(`Failed to mark keyword as used: ${error.message}`);
      return false;
    }

    if (!data || data.length === 0) {
      debug(`Keyword "${keyword}" was not active at update time`);
      return false;
    }

    return true;
  } catch (err: any) {
    debug(`Failed to mark keyword as used: ${err.message}`);
    return false;
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
          { type: 'mrkdwn', text: `*Publish-Ready:*\n${summary.publishedArticles}` },
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
    remediatedWines: [],
    refreshTargets: [],
    errors: [],
    runRecordId: null,
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
  activePipelineResult = result;

  console.log('\n' + '═'.repeat(60));
  console.log('🍷 AUTONOMOUS CONTENT PIPELINE');
  console.log('═'.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Generate: ${skipGenerate || refreshOnly ? 'SKIP' : generateCount + ' articles'}`);
  console.log(`Enrich: ${skipEnrich ? 'SKIP' : 'up to ' + enrichLimit + ' articles'}`);
  if (refreshOnly) {
    console.log(`Refresh Mode: ENABLED (limit ${refreshLimit})`);
  }
  console.log(`Wine Validation: ${doValidateWines ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Scoring Scope: ${fullScan ? 'FULL SCAN' : 'INCREMENTAL'}`);
  console.log('═'.repeat(60) + '\n');

  result.runRecordId = await createPipelineRunRecord();

  // Step 1: Generate new articles
  if (!skipGenerate && !refreshOnly) {
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
              debug(`No direct wine matches for "${keyword.keyword}" - generator fallback logic will decide whether to proceed`);
            } else {
              debug(`Found ${wines.length} matching wines for "${keyword.keyword}"`);
            }
          } catch (err: any) {
            debug(`Wine check failed: ${err.message} - proceeding anyway`);
          }
        }

        debug(`Cluster ${keyword.clusterKey} | role ${keyword.pageRole} | category ${keyword.category} | cluster coverage ${keyword.clusterCoverage}`);

        const slug = await generateArticle(keyword, result);
        if (slug) {
          debug(`Generated mapping: "${keyword.keyword}" -> ${slug}`);
          const markedUsed = await markKeywordUsed(keyword.keyword);
          if (!markedUsed) {
            result.errors.push(`Could not mark keyword as used: "${keyword.keyword}"`);
          }
          generated++;
        } else {
          result.skipped.push({
            slug: keyword.keyword
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, ''),
            reason: `Generation failed for keyword "${keyword.keyword}"`,
          });
        }

        // Rate limit between generations
        if (generated < generateCount) {
          debug('Waiting 5s before next generation...');
          await new Promise(r => setTimeout(r, 5000));
        }
      }

      log(`Generated ${result.generated.length} new articles`, 'success');

      // Auto-enrich newly generated articles to boost word count
      if (result.generated.length > 0 && !skipEnrich) {
        log('\nSTEP 1b: Auto-enriching new articles...', 'info');

        for (const article of result.generated) {
          try {
            log(`Auto-enriching: ${article.slug}`, 'info');

            // Find the file path for this article
            const filePath = path.join(process.cwd(), 'src/pages', article.category, `${article.slug}.astro`);

            if (fs.existsSync(filePath)) {
              // Create a minimal score object for enrichArticle
              const tempScore: QAScore = {
                slug: article.slug,
                filePath,
                category: article.category,
                totalScore: 70, // Placeholder - will be properly scored in Step 2
                status: 'review' as const,
                issues: [],
                metrics: {
                  wordCount: 0,
                  readTimeMinutes: 0,
                  hasImage: false,
                  h2Count: 0,
                  hasQuickAnswer: false,
                  hasExpertTips: false,
                  hasFAQ: false,
                  hasAuthorBio: false,
                  wineCount: 0,
                  hasMetaDescription: false,
                  hasCanonicalUrl: false,
                  hasSchema: false,
                  internalLinkCount: 0,
                },
              };

              await enrichArticle(tempScore, result);

              // Rate limit between enrichments
              debug('Waiting 5s before next enrichment...');
              await new Promise(r => setTimeout(r, 5000));
            }
          } catch (err: any) {
            log(`Failed to auto-enrich ${article.slug}: ${err.message}`, 'error');
          }
        }

        log(`Auto-enriched ${result.generated.length} new articles`, 'success');
      }
    }
  } else {
    log('STEP 1: Skipping generation', 'info');
  }

  // Determine scoring scope for this run
  let scoringFilePaths: string[] = [];
  const shouldUseFullScan = fullScan || isDryRun || skipGenerate || result.generated.length === 0;
  if (shouldUseFullScan) {
    scoringFilePaths = collectArticleFilePaths();
    debug(`Using full-scan scoring scope (${scoringFilePaths.length} files)`);
  } else {
    scoringFilePaths = result.generated
      .map(a => path.join(process.cwd(), 'src/pages', a.category, `${a.slug}.astro`))
      .filter(p => fs.existsSync(p));
    debug(`Using incremental scoring scope (${scoringFilePaths.length} files)`);

    // Safety fallback if generated files are unexpectedly missing
    if (scoringFilePaths.length === 0) {
      scoringFilePaths = collectArticleFilePaths();
      debug(`Incremental scope empty, fell back to full scan (${scoringFilePaths.length} files)`);
    }
  }

  // Step 2: Score target articles
  log('\nSTEP 2: Scoring articles...', 'info');

  const allScores = await scoreArticleFiles(scoringFilePaths);
  const scoreSummary = getScoreSummary(allScores);

  log(`Scored ${allScores.length} articles (avg: ${scoreSummary.avgScore}%)`, 'info');
  debug(`Pass: ${scoreSummary.passed}, Review: ${scoreSummary.review}, Fail: ${scoreSummary.failed}`);

  // Step 3: Enrich articles that need it
  if (!skipEnrich) {
    log('\nSTEP 3: Enriching low-scoring articles...', 'info');
    const refreshPriority = rankRefreshCandidates(
      allScores,
      collectContentGraph(),
      refreshOnly ? Math.max(refreshLimit * 2, refreshLimit) : Math.max(enrichLimit * 2, 6)
    );
    const refreshMap = new Map(refreshPriority.map(candidate => [`${candidate.category}/${candidate.slug}`, candidate.score]));
    const needsEnrichment = allScores
      .filter(s => s.totalScore < AUTO_PUBLISH_THRESHOLD && s.totalScore >= REJECT_THRESHOLD)
      .sort((a, b) => {
        const aPriority = refreshMap.get(`${a.category}/${a.slug}`) || 0;
        const bPriority = refreshMap.get(`${b.category}/${b.slug}`) || 0;
        if (aPriority !== bPriority) return bPriority - aPriority;
        return a.totalScore - b.totalScore;
      })
      .slice(0, refreshOnly ? refreshLimit : enrichLimit);

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

  const finalScores = await scoreArticleFiles(scoringFilePaths, doValidateWines);
  const contentGraph = collectContentGraph();

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

  result.refreshTargets = rankRefreshCandidates(finalScores, contentGraph, Math.max(enrichLimit, 3))
    .map(candidate => ({
      slug: candidate.slug,
      category: candidate.category,
      reasons: candidate.reasons,
      priorityScore: candidate.score,
    }));

  if (!isDryRun && doValidateWines && result.flaggedWines.length > 0) {
    log('\nSTEP 5: Remediating invalid wine recommendation sections...', 'info');
    for (const flagged of result.flaggedWines) {
      const score = finalScores.find(entry => entry.slug === flagged.slug);
      if (!score) continue;
      log(`Refreshing wine recommendations: ${score.category}/${flagged.slug}`, 'info');
      await remediateFlaggedWineArticle(flagged.slug, score.category, result);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Log results
  if (!isDryRun) {
    logResults(result);
  }

  await insertArticleOutcomeRecords(result.runRecordId ?? null, result);
  await updatePipelineRunRecord(result.runRecordId ?? null, result, 'completed');

  // Send notification if requested
  if (sendNotification) {
    await sendNotificationSummary(result);
  }

  activePipelineResult = null;
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
  console.log(`   Publish-ready:          ${result.summary.publishedArticles}`);
  console.log(`   Rejected (low quality): ${result.summary.rejectedArticles}`);
  console.log(`   Average quality score:  ${result.summary.avgScore}%`);

  if (result.published.length > 0) {
    console.log(`\n✅ PUBLISH-READY (${AUTO_PUBLISH_THRESHOLD}%+ score):`);
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

  if (result.remediatedWines.length > 0) {
    console.log(`\n🍷 WINE REMEDIATION:`);
    for (const remediation of result.remediatedWines) {
      console.log(`   ${remediation.slug}: ${remediation.fixed ? 'recommendation sections refreshed' : remediation.reason || 'not fixed'}`);
    }
  }

  if (result.refreshTargets.length > 0) {
    console.log(`\n🔁 REFRESH TARGETS:`);
    for (const target of result.refreshTargets.slice(0, 5)) {
      console.log(`   ${target.category}/${target.slug} (${target.priorityScore}) - ${target.reasons.join(', ')}`);
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
  .catch(async (err) => {
    if (activePipelineResult) {
      activePipelineResult.errors.push(err instanceof Error ? err.message : String(err));
      await updatePipelineRunRecord(activePipelineResult.runRecordId ?? null, activePipelineResult, 'failed');
      activePipelineResult = null;
    }
    debug(`Pipeline failed before completion: ${err instanceof Error ? err.message : String(err)}`);
    console.error('Pipeline failed:', err);
    process.exit(1);
  });
