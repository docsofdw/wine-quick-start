/**
 * Telegram Webhook API Endpoint
 *
 * Handles callback queries from inline keyboard buttons.
 * Set webhook URL in Telegram: https://yoursite.com/api/telegram-webhook
 *
 * To set webhook:
 *   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://yoursite.com/api/telegram-webhook"
 */

import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

const TELEGRAM_BOT_TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = import.meta.env.TELEGRAM_WEBHOOK_SECRET;
const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;
const GITHUB_REPO = import.meta.env.GITHUB_REPO || 'docsofdw/wine-quick-start';

interface TelegramUpdate {
  update_id: number;
  callback_query?: {
    id: string;
    from: { id: number; first_name: string };
    message: {
      message_id: number;
      chat: { id: number };
      text: string;
    };
    data: string;
  };
  message?: {
    message_id: number;
    chat: { id: number };
    text: string;
    from: { id: number; first_name: string };
  };
}

/**
 * Answer a callback query (acknowledge button press)
 */
async function answerCallback(callbackId: string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text,
      show_alert: false,
    }),
  });
}

/**
 * Edit the original message
 */
async function editMessage(chatId: number, messageId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
    }),
  });
}

/**
 * Send a message
 */
async function sendMessage(chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
}

/**
 * Delete an article file via GitHub API
 */
async function deleteArticleViaGitHub(slug: string): Promise<{ success: boolean; error?: string }> {
  if (!GITHUB_TOKEN) {
    return { success: false, error: 'GitHub token not configured' };
  }

  // Find the article in possible locations
  const categories = ['learn', 'wine-pairings', 'buy'];
  let filePath: string | null = null;
  let category: string | null = null;

  for (const cat of categories) {
    const testPath = `src/pages/${cat}/${slug}.astro`;
    // Check if file exists via GitHub API
    const checkUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${testPath}`;
    const checkRes = await fetch(checkUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (checkRes.ok) {
      filePath = testPath;
      category = cat;
      break;
    }
  }

  if (!filePath) {
    return { success: false, error: 'Article not found' };
  }

  // Get file SHA (required for deletion)
  const fileUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
  const fileRes = await fetch(fileUrl, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!fileRes.ok) {
    return { success: false, error: 'Failed to get file info' };
  }

  const fileData = await fileRes.json();

  // Delete the file
  const deleteRes = await fetch(fileUrl, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Delete article: ${slug} (via Telegram)`,
      sha: fileData.sha,
    }),
  });

  if (!deleteRes.ok) {
    const err = await deleteRes.json();
    return { success: false, error: err.message || 'Delete failed' };
  }

  // Also try to delete the image if it exists
  const imagePath = `src/assets/images/articles/${slug}.png`;
  try {
    const imgRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${imagePath}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (imgRes.ok) {
      const imgData = await imgRes.json();
      await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${imagePath}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Delete image for: ${slug} (via Telegram)`,
          sha: imgData.sha,
        }),
      });
    }
  } catch (e) {
    // Image deletion is optional
  }

  return { success: true };
}

/**
 * Handle callback query (button press)
 */
async function handleCallback(query: TelegramUpdate['callback_query']): Promise<void> {
  if (!query) return;

  const { id, data, message } = query;
  const chatId = message.chat.id;
  const messageId = message.message_id;

  const [action, payload] = data.split(':');

  switch (action) {
    case 'keep': {
      await answerCallback(id, '✅ Article kept!');
      const newText = message.text + '\n\n✅ <i>Kept</i>';
      await editMessage(chatId, messageId, newText);
      break;
    }

    case 'delete': {
      await answerCallback(id, '🗑 Deleting article...');

      const result = await deleteArticleViaGitHub(payload);

      if (result.success) {
        const newText = message.text + '\n\n🗑 <i>Deleted</i>';
        await editMessage(chatId, messageId, newText);
      } else {
        await sendMessage(chatId, `❌ Failed to delete: ${result.error}`);
      }
      break;
    }

    case 'open': {
      // Just acknowledge - Telegram will open the URL
      await answerCallback(id, '🔗 Opening...');
      break;
    }

    case 'view_all': {
      await answerCallback(id, '📋 Opening site...');
      await sendMessage(chatId, '🔗 <a href="https://winequickstart.com/learn">View All Articles</a>');
      break;
    }

    case 'run_pipeline': {
      await answerCallback(id, '🔄 Pipeline can be triggered from GitHub Actions');
      await sendMessage(
        chatId,
        '🔄 To run the pipeline:\n\n' +
        '1. Go to GitHub Actions\n' +
        '2. Select "Autonomous Content Pipeline"\n' +
        '3. Click "Run workflow"'
      );
      break;
    }

    default:
      await answerCallback(id, '❓ Unknown action');
  }
}

/**
 * Handle regular message
 */
async function handleMessage(message: TelegramUpdate['message']): Promise<void> {
  if (!message) return;

  const chatId = message.chat.id;
  const text = message.text?.toLowerCase() || '';

  if (text === '/start' || text === '/help') {
    await sendMessage(
      chatId,
      '🍷 <b>Wine Pipeline Bot</b>\n\n' +
      'I notify you when new articles are published.\n\n' +
      '<b>Commands:</b>\n' +
      '/status - Pipeline status\n' +
      '/recent - Recent articles\n' +
      '/help - Show this help'
    );
  } else if (text === '/status') {
    await sendMessage(chatId, '📊 Pipeline runs Mon/Thu at 6am UTC');
  } else if (text === '/recent') {
    await sendMessage(
      chatId,
      '📚 <a href="https://winequickstart.com/learn">View Recent Articles</a>'
    );
  }
}

export const POST: APIRoute = async ({ request }) => {
  // Verify webhook secret if configured
  if (TELEGRAM_WEBHOOK_SECRET) {
    const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (secret !== TELEGRAM_WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    const update: TelegramUpdate = await request.json();

    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message);
    }

    return new Response('OK', { status: 200 });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return new Response('Error', { status: 500 });
  }
};

// Also support GET for webhook verification
export const GET: APIRoute = async () => {
  return new Response('Telegram webhook endpoint', { status: 200 });
};
