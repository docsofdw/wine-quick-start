/**
 * Telegram Chat ID Helper
 *
 * Helps you get your Telegram chat ID for notifications.
 *
 * Usage:
 *   1. Set TELEGRAM_BOT_TOKEN in .env.local
 *   2. Send any message to your bot on Telegram
 *   3. Run: npx tsx src/scripts/telegram-get-chat-id.ts
 *   4. Copy the chat ID to .env.local as TELEGRAM_CHAT_ID
 */

import { config } from 'dotenv';
config({ path: '.env.local', override: true });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function getChatId() {
  console.log('🤖 Telegram Chat ID Helper\n');

  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ Missing TELEGRAM_BOT_TOKEN in .env.local');
    console.log('\nSteps to set up:');
    console.log('1. Open Telegram and message @BotFather');
    console.log('2. Send /newbot');
    console.log('3. Choose a name (e.g., "Wine Pipeline Bot")');
    console.log('4. Choose a username (e.g., "wine_pipeline_bot")');
    console.log('5. Copy the token BotFather gives you');
    console.log('6. Add to .env.local:');
    console.log('   TELEGRAM_BOT_TOKEN=your_token_here');
    console.log('7. Run this script again');
    process.exit(1);
  }

  console.log('Fetching recent messages to your bot...\n');

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok) {
      console.error('❌ Telegram API error:', data.description);
      process.exit(1);
    }

    if (!data.result || data.result.length === 0) {
      console.log('⚠️  No messages found.\n');
      console.log('Please send any message to your bot on Telegram first!');
      console.log('1. Open Telegram');
      console.log('2. Search for your bot by its username');
      console.log('3. Send it a message (e.g., "hello")');
      console.log('4. Run this script again');
      process.exit(0);
    }

    // Get unique chat IDs
    const chats = new Map<number, { name: string; type: string }>();

    for (const update of data.result) {
      const message = update.message || update.callback_query?.message;
      if (message?.chat) {
        const chat = message.chat;
        const name = chat.title || chat.first_name || chat.username || 'Unknown';
        chats.set(chat.id, { name, type: chat.type });
      }
    }

    console.log('Found chat(s):\n');
    console.log('═'.repeat(50));

    for (const [id, info] of chats) {
      console.log(`  Chat ID: ${id}`);
      console.log(`  Name: ${info.name}`);
      console.log(`  Type: ${info.type}`);
      console.log('─'.repeat(50));
    }

    console.log('\n✅ Add this to your .env.local file:\n');

    const firstChatId = Array.from(chats.keys())[0];
    console.log(`TELEGRAM_CHAT_ID=${firstChatId}`);

    console.log('\n📝 Then you can test with:');
    console.log('   npx tsx src/scripts/telegram-notify.ts --article=best-pinot-noir\n');

  } catch (err: any) {
    console.error('❌ Failed to fetch updates:', err.message);
    process.exit(1);
  }
}

getChatId();
