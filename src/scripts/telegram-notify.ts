/**
 * Telegram Notification Script
 *
 * Sends article notifications to Telegram with inline action buttons.
 *
 * Usage:
 *   npx tsx src/scripts/telegram-notify.ts --article=slug
 *   npx tsx src/scripts/telegram-notify.ts --summary  (pipeline summary)
 *
 * Environment:
 *   TELEGRAM_BOT_TOKEN - Bot token from @BotFather
 *   TELEGRAM_CHAT_ID - Your chat/group ID
 */

import { config } from 'dotenv';
config({ path: '.env.local', override: true });

import fs from 'fs';
import path from 'path';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SITE_URL = process.env.SITE_URL || 'https://winesquickstart.com';

// Parse CLI args
const args = process.argv.slice(2);
const articleSlug = args.find(a => a.startsWith('--article='))?.split('=')[1];
const sendSummary = args.includes('--summary');
const pipelineLogFile = args.find(a => a.startsWith('--log='))?.split('=')[1];

interface ArticleInfo {
  slug: string;
  category: string;
  title: string;
  keywords: string[];
  wordCount: number;
  score?: number;
  filePath: string;
}

interface PipelineResult {
  generated: { slug: string; category: string; keyword: string }[];
  enriched: { slug: string; beforeScore: number; afterScore: number }[];
  published: { slug: string; score: number }[];
  rejected: { slug: string; score: number; reason: string }[];
  summary: {
    newArticles: number;
    enrichedArticles: number;
    publishedArticles: number;
    avgScore: number;
  };
}

/**
 * Send a message to Telegram
 */
async function sendTelegramMessage(
  text: string,
  inlineKeyboard?: { text: string; callback_data: string }[][]
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return false;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const body: any = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
  };

  if (inlineKeyboard) {
    body.reply_markup = {
      inline_keyboard: inlineKeyboard,
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram API error:', result.description);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Failed to send Telegram message:', err.message);
    return false;
  }
}

/**
 * Extract article info from .astro file
 */
function getArticleInfo(slug: string): ArticleInfo | null {
  const pagesDir = path.join(process.cwd(), 'src/pages');
  const categories = ['learn', 'wine-pairings', 'buy'];

  for (const category of categories) {
    const filePath = path.join(pagesDir, category, `${slug}.astro`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract title
      const titleMatch = content.match(/title:\s*["']([^"']+)["']/);
      const title = titleMatch ? titleMatch[1] : slug;

      // Extract keywords
      const keywordsMatch = content.match(/keywords:\s*\[([^\]]+)\]/);
      const keywords = keywordsMatch
        ? keywordsMatch[1].split(',').map(k => k.trim().replace(/["']/g, ''))
        : [];

      // Count words
      const textContent = content
        .replace(/---[\s\S]*?---/, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const wordCount = textContent.split(' ').filter(w => w.length > 0).length;

      return {
        slug,
        category,
        title,
        keywords,
        wordCount,
        filePath,
      };
    }
  }

  return null;
}

/**
 * Send notification for a single article
 */
async function notifyArticle(slug: string, score?: number): Promise<void> {
  const article = getArticleInfo(slug);

  if (!article) {
    console.error(`Article not found: ${slug}`);
    return;
  }

  const articleUrl = `${SITE_URL}/${article.category}/${article.slug}`;
  const keywordsStr = article.keywords.slice(0, 5).join(', ') || 'N/A';
  const scoreStr = score ? `${score}%` : 'N/A';

  const message = `
<b>New Article Published</b>

<b>Title:</b> ${escapeHtml(article.title)}
<b>Category:</b> ${article.category}
<b>Keywords:</b> ${escapeHtml(keywordsStr)}
<b>Words:</b> ${article.wordCount.toLocaleString()}
<b>Score:</b> ${scoreStr}

<a href="${articleUrl}">View Article</a>
`.trim();

  const keyboard = [
    [
      { text: '👍 Keep', callback_data: `keep:${slug}` },
      { text: '🗑 Delete', callback_data: `delete:${slug}` },
    ],
    [
      { text: '🔗 Open Article', callback_data: `open:${articleUrl}` },
    ],
  ];

  const sent = await sendTelegramMessage(message, keyboard);
  console.log(sent ? `✅ Notified: ${slug}` : `❌ Failed: ${slug}`);
}

/**
 * Send pipeline summary notification
 */
async function notifyPipelineSummary(logFile?: string): Promise<void> {
  let result: PipelineResult | null = null;

  // Try to read from log file
  if (logFile && fs.existsSync(logFile)) {
    try {
      result = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    } catch (err) {
      console.error('Failed to parse log file');
    }
  }

  // Find most recent log if not specified
  if (!result) {
    const logsDir = path.join(process.cwd(), 'pipeline-logs');
    if (fs.existsSync(logsDir)) {
      const logs = fs.readdirSync(logsDir)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse();

      if (logs.length > 0) {
        const latestLog = path.join(logsDir, logs[0]);
        try {
          result = JSON.parse(fs.readFileSync(latestLog, 'utf-8'));
        } catch (err) {
          console.error('Failed to parse latest log');
        }
      }
    }
  }

  if (!result) {
    console.error('No pipeline results found');
    return;
  }

  const emoji = result.summary.newArticles > 0 ? '🍷' : '📊';
  const status = result.rejected.length > 0 ? '⚠️' : '✅';

  let message = `
${emoji} <b>Content Pipeline Complete</b> ${status}

<b>New Articles:</b> ${result.summary.newArticles}
<b>Enriched:</b> ${result.summary.enrichedArticles}
<b>Ready to Publish:</b> ${result.summary.publishedArticles}
<b>Avg Score:</b> ${result.summary.avgScore}%
`.trim();

  // Add new article details
  if (result.generated.length > 0) {
    message += '\n\n<b>New Articles:</b>';
    for (const article of result.generated.slice(0, 5)) {
      const url = `${SITE_URL}/${article.category}/${article.slug}`;
      message += `\n• <a href="${url}">${article.keyword}</a>`;
    }
    if (result.generated.length > 5) {
      message += `\n  ... and ${result.generated.length - 5} more`;
    }
  }

  // Add rejected articles warning
  if (result.rejected.length > 0) {
    message += '\n\n<b>⚠️ Rejected:</b>';
    for (const article of result.rejected.slice(0, 3)) {
      message += `\n• ${article.slug} (${article.score}%)`;
    }
  }

  const keyboard = [
    [
      { text: '📋 View All Articles', callback_data: 'view_all' },
      { text: '🔄 Run Pipeline', callback_data: 'run_pipeline' },
    ],
  ];

  const sent = await sendTelegramMessage(message, keyboard);
  console.log(sent ? '✅ Pipeline summary sent' : '❌ Failed to send summary');

  // Send individual notifications for new articles
  if (result.generated.length > 0) {
    console.log('\nSending individual article notifications...');
    for (const article of result.generated) {
      const published = result.published.find(p => p.slug === article.slug);
      await notifyArticle(article.slug, published?.score);
      // Rate limit
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Main
 */
async function main() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ Missing TELEGRAM_BOT_TOKEN in .env.local');
    console.log('\nTo set up Telegram notifications:');
    console.log('1. Message @BotFather on Telegram');
    console.log('2. Send /newbot and follow instructions');
    console.log('3. Copy the token and add to .env.local:');
    console.log('   TELEGRAM_BOT_TOKEN=your_token_here');
    process.exit(1);
  }

  if (!TELEGRAM_CHAT_ID) {
    console.error('❌ Missing TELEGRAM_CHAT_ID in .env.local');
    console.log('\nRun this to get your chat ID:');
    console.log('   npx tsx src/scripts/telegram-get-chat-id.ts');
    process.exit(1);
  }

  if (articleSlug) {
    await notifyArticle(articleSlug);
  } else if (sendSummary) {
    await notifyPipelineSummary(pipelineLogFile);
  } else {
    console.log('Usage:');
    console.log('  npx tsx src/scripts/telegram-notify.ts --article=slug');
    console.log('  npx tsx src/scripts/telegram-notify.ts --summary');
    console.log('  npx tsx src/scripts/telegram-notify.ts --summary --log=path/to/log.json');
  }
}

main().catch(console.error);
