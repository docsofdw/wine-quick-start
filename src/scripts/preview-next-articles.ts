/**
 * Preview what articles would be generated next
 * (without actually creating them)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local', override: true });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

// Normalize keyword for duplicate detection
function normalizeKeyword(keyword: string): string {
  return keyword.toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(' ')
    .filter(w => w.length > 0)
    .sort()
    .join(' ');
}

function keywordToSlug(keyword: string): string {
  return keyword.toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-');
}

async function previewNextArticles() {
  console.log('=== Preview: Next 5 Articles to Generate ===\n');

  // Get existing page slugs
  const { data: existingPages } = await supabase
    .from('wine_pages')
    .select('slug');

  const existingSlugs = new Set(existingPages?.map(p => p.slug) || []);

  // Get used keywords for duplicate detection
  const { data: usedKeywordsData } = await supabase
    .from('keyword_opportunities')
    .select('keyword')
    .eq('status', 'used');

  const usedNormalizedKeywords = new Set(
    usedKeywordsData?.map(kw => normalizeKeyword(kw.keyword)) || []
  );

  console.log(`📊 Existing pages: ${existingSlugs.size}`);
  console.log(`📊 Used keyword patterns: ${usedNormalizedKeywords.size}\n`);

  // Get active keywords (excluding duplicates)
  const { data: keywordData } = await supabase
    .from('keyword_opportunities')
    .select('keyword, search_volume, priority')
    .or('status.is.null,status.eq.active')
    .order('priority', { ascending: false })
    .order('search_volume', { ascending: false })
    .limit(50);

  if (!keywordData) {
    console.log('No keywords found');
    return;
  }

  const selectedNormalizedKeywords = new Set<string>();
  const nextArticles: { keyword: string; volume: number; slug: string; }[] = [];

  for (const kw of keywordData) {
    if (nextArticles.length >= 5) break;

    const slug = keywordToSlug(kw.keyword);
    const normalized = normalizeKeyword(kw.keyword);

    if (existingSlugs.has(slug)) continue;
    if (usedNormalizedKeywords.has(normalized)) continue;
    if (selectedNormalizedKeywords.has(normalized)) continue;

    selectedNormalizedKeywords.add(normalized);
    nextArticles.push({
      keyword: kw.keyword,
      volume: kw.search_volume || 0,
      slug
    });
  }

  console.log('Next 5 unique articles to generate:\n');
  nextArticles.forEach((article, i) => {
    console.log(`${i + 1}. "${article.keyword}"`);
    console.log(`   Volume: ${article.volume.toLocaleString()}/month`);
    console.log(`   Slug: ${article.slug}`);
    console.log('');
  });

  const totalVolume = nextArticles.reduce((sum, a) => sum + a.volume, 0);
  console.log(`Total search volume: ${totalVolume.toLocaleString()}/month`);
}

previewNextArticles();
