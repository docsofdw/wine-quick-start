/**
 * Check what data is saved in Supabase database
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load env vars
config({ path: '.env.local', override: true });

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_ANON_KEY not found in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkData() {
  console.log('📊 Checking Supabase database data...\n');

  try {
    // Check keyword_opportunities table
    console.log('1. Keyword Opportunities:');
    const { data: keywords, error: keywordError, count: keywordCount } = await supabase
      .from('keyword_opportunities')
      .select('keyword, search_volume, keyword_difficulty, priority, created_at', { count: 'exact' })
      .order('priority', { ascending: false })
      .limit(10);

    if (keywordError) {
      console.error('❌ Error fetching keywords:', keywordError);
    } else {
      console.log(`✅ Found ${keywordCount} keyword opportunities`);
      console.log('\nTop 10 Keywords:');
      keywords?.forEach((kw, i) => {
        console.log(`${i + 1}. ${kw.keyword} (Vol: ${kw.search_volume}, KD: ${kw.keyword_difficulty}, Priority: ${kw.priority})`);
      });
    }

    // Check wine_pages table
    console.log('\n2. Wine Pages:');
    const { data: pages, error: pagesError, count: pagesCount } = await supabase
      .from('wine_pages')
      .select('slug, title, status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(15);

    if (pagesError) {
      console.error('❌ Error fetching pages:', pagesError);
    } else {
      console.log(`✅ Found ${pagesCount} wine pages`);
      if (pages && pages.length > 0) {
        console.log('\nRecent Pages:');
        pages.forEach((page, i) => {
          console.log(`${i + 1}. ${page.slug} - ${page.title} (Status: ${page.status})`);
        });
      } else {
        console.log('No wine pages found yet');
      }
    }

    // Check email_subscribers table (if it exists)
    console.log('\n3. Email Subscribers:');
    const { data: emails, error: emailError, count: emailCount } = await supabase
      .from('email_subscribers')
      .select('email, source, lead_magnet, subscribed_at', { count: 'exact' })
      .order('subscribed_at', { ascending: false })
      .limit(5);

    if (emailError) {
      console.log('⚠️  Email subscribers table not found (needs to be created)');
    } else {
      console.log(`✅ Found ${emailCount} email subscribers`);
      if (emails && emails.length > 0) {
        emails.forEach((email, i) => {
          console.log(`${i + 1}. ${email.email} (Source: ${email.source})`);
        });
      } else {
        console.log('No email subscribers yet');
      }
    }

    console.log('\n📈 Database Summary:');
    console.log(`- Keywords: ${keywordCount} opportunities`);
    console.log(`- Pages: ${pagesCount} wine pages`);
    console.log(`- Emails: ${emailCount || 0} subscribers`);

  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkData();