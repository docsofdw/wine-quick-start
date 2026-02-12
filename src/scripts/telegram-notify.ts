/**
 * Telegram Notification Script
 *
 * Sends article notifications to Telegram with images and inline action buttons.
 *
 * Usage:
 *   npx tsx src/scripts/telegram-notify.ts --article=slug
 *   npx tsx src/scripts/telegram-notify.ts --summary  (pipeline summary)
 *   npx tsx src/scripts/telegram-notify.ts --digest   (weekly digest)
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
const sendDigest = args.includes('--digest');
const pipelineLogFile = args.find(a => a.startsWith('--log='))?.split('=')[1];

interface ArticleInfo {
  slug: string;
  category: string;
  title: string;
  keywords: string[];
  wordCount: number;
  score?: number;
  filePath: string;
  wineCount: number;
  hasImage: boolean;
  imagePath?: string;
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
 * Send a photo with caption to Telegram
 */
async function sendTelegramPhoto(
  photoPath: string,
  caption: string,
  inlineKeyboard?: { text: string; callback_data?: string; url?: string }[][]
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return false;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;

  // Read the image file
  const imageBuffer = fs.readFileSync(photoPath);
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  formData.append('photo', new Blob([imageBuffer]), path.basename(photoPath));
  formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');

  if (inlineKeyboard) {
    formData.append('reply_markup', JSON.stringify({ inline_keyboard: inlineKeyboard }));
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram API error:', result.description);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Failed to send Telegram photo:', err.message);
    return false;
  }
}

/**
 * Send a message to Telegram (text only fallback)
 */
async function sendTelegramMessage(
  text: string,
  inlineKeyboard?: { text: string; callback_data?: string; url?: string }[][]
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

      // Count wine recommendations (look for wine card divs or h3 with prices)
      const wineMatches = content.match(/class="[^"]*wine[^"]*rounded-lg[^"]*"/g) || [];
      const priceMatches = content.match(/\$\d+/g) || [];
      const wineCount = Math.max(wineMatches.length, Math.floor(priceMatches.length / 2));

      // Check for featured image
      const imagePath = path.join(process.cwd(), 'src/assets/images/articles', `${slug}.png`);
      const hasImage = fs.existsSync(imagePath);

      return {
        slug,
        category,
        title,
        keywords,
        wordCount,
        filePath,
        wineCount,
        hasImage,
        imagePath: hasImage ? imagePath : undefined,
      };
    }
  }

  return null;
}

/**
 * Get QA score for an article
 */
async function getArticleScore(slug: string): Promise<number | null> {
  // Try to find score in recent pipeline logs
  const logsDir = path.join(process.cwd(), 'pipeline-logs');
  if (fs.existsSync(logsDir)) {
    const logs = fs.readdirSync(logsDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    for (const logFile of logs.slice(0, 5)) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(logsDir, logFile), 'utf-8'));
        const published = data.published?.find((p: any) => p.slug === slug);
        if (published?.score) return published.score;
      } catch (e) {
        // Skip invalid logs
      }
    }
  }
  return null;
}

/**
 * Send notification for a single article with image
 */
async function notifyArticle(slug: string, score?: number): Promise<void> {
  const article = getArticleInfo(slug);

  if (!article) {
    console.error(`Article not found: ${slug}`);
    return;
  }

  // Get score if not provided
  const finalScore = score ?? await getArticleScore(slug);

  const articleUrl = `${SITE_URL}/${article.category}/${article.slug}`;
  const primaryKeyword = article.keywords[0] || slug.replace(/-/g, ' ');
  const scoreStr = finalScore ? `${finalScore}%` : 'N/A';
  const wineStr = article.wineCount > 0 ? `${article.wineCount} wines` : 'No wines';

  // Build caption
  const caption = `
🍷 <b>New Article Published</b>

<b>${escapeHtml(article.title)}</b>

📝 <b>Keyword:</b> ${escapeHtml(primaryKeyword)}
📁 <b>Category:</b> ${article.category}
📊 <b>QA Score:</b> ${scoreStr}
📖 <b>Words:</b> ${article.wordCount.toLocaleString()}
🍾 <b>Wines:</b> ${wineStr}

🔗 ${articleUrl}
`.trim();

  const keyboard = [
    [
      { text: '✅ Keep', callback_data: `keep:${slug}` },
      { text: '🗑 Delete', callback_data: `delete:${slug}` },
    ],
    [
      { text: '🔗 View Article', url: articleUrl },
    ],
  ];

  let sent = false;

  // Try to send with image first
  if (article.imagePath && article.hasImage) {
    sent = await sendTelegramPhoto(article.imagePath, caption, keyboard);
  }

  // Fallback to text message
  if (!sent) {
    sent = await sendTelegramMessage(caption, keyboard);
  }

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
      { text: '📋 View All Articles', url: `${SITE_URL}/learn/` },
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
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

/**
 * Send weekly digest with article stats
 */
async function sendWeeklyDigest(): Promise<void> {
  const categories = ['learn', 'wine-pairings', 'buy'];
  const pagesDir = path.join(process.cwd(), 'src/pages');

  let totalArticles = 0;
  let totalWords = 0;
  let articlesWithImages = 0;
  const categoryStats: { [key: string]: number } = {};

  // Count articles in each category
  for (const category of categories) {
    const categoryDir = path.join(pagesDir, category);
    if (fs.existsSync(categoryDir)) {
      const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.astro') && f !== 'index.astro');
      categoryStats[category] = files.length;
      totalArticles += files.length;

      // Sample a few articles for word count
      for (const file of files.slice(0, 10)) {
        const slug = file.replace('.astro', '');
        const info = getArticleInfo(slug);
        if (info) {
          totalWords += info.wordCount;
          if (info.hasImage) articlesWithImages++;
        }
      }
    }
  }

  const avgWords = totalArticles > 0 ? Math.round(totalWords / Math.min(totalArticles, 30)) : 0;
  const imagePercent = totalArticles > 0 ? Math.round((articlesWithImages / Math.min(totalArticles, 30)) * 100) : 0;

  const message = `
📊 <b>Weekly Content Digest</b>

<b>Total Articles:</b> ${totalArticles}
<b>Avg Word Count:</b> ~${avgWords.toLocaleString()}
<b>With Images:</b> ~${imagePercent}%

<b>By Category:</b>
• Learn: ${categoryStats['learn'] || 0} articles
• Wine Pairings: ${categoryStats['wine-pairings'] || 0} articles
• Buy Guides: ${categoryStats['buy'] || 0} articles

<b>Pipeline Schedule:</b>
Mon & Thu @ 6am UTC

🔗 <a href="${SITE_URL}">Visit Site</a>
`.trim();

  const keyboard = [
    [
      { text: '📖 Learn', url: `${SITE_URL}/learn/` },
      { text: '🍽 Pairings', url: `${SITE_URL}/wine-pairings/` },
    ],
  ];

  const sent = await sendTelegramMessage(message, keyboard);
  console.log(sent ? '✅ Weekly digest sent' : '❌ Failed to send digest');
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
  } else if (sendDigest) {
    await sendWeeklyDigest();
  } else {
    console.log('Usage:');
    console.log('  npx tsx src/scripts/telegram-notify.ts --article=slug');
    console.log('  npx tsx src/scripts/telegram-notify.ts --summary');
    console.log('  npx tsx src/scripts/telegram-notify.ts --digest');
    console.log('  npx tsx src/scripts/telegram-notify.ts --summary --log=path/to/log.json');
  }
}

main().catch(console.error);
