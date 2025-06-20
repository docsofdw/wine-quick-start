import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load env vars from `.env.local` (falls back to `.env` automatically if desired)
config({ path: '.env.local', override: true });

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌  SUPABASE_URL or SUPABASE_ANON_KEY not found in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  // Lightweight head-only query – returns no rows, just the count
  const { count, error } = await supabase
    .from('keywords')
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('❌  Supabase query failed:', error.message);
    process.exit(1);
  }

  console.log(`✅  Supabase connected. 'keywords' table currently has ${count ?? 0} row(s).`);
  process.exit(0);
}

run(); 