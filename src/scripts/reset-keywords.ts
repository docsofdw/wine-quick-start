import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local', override: true });

const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

const keywordsToReset = [
  "champagne wine",
  "best champagne",
  "bordeaux wine",
  "burgundy wine",
  "thanksgiving wine pairing",
  "napa valley wine",
  "barolo wine",
  "best cabernet sauvignon",
  "california wine",
  "best pinot noir"
];

async function reset() {
  for (const kw of keywordsToReset) {
    await client.from('keyword_opportunities').update({ status: 'active', used_at: null }).eq('keyword', kw);
    console.log(`Reset: ${kw}`);
  }
}

reset().then(() => process.exit(0));
