/**
 * Setup Supabase database schema for wine automation
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

async function setupDatabase() {
  console.log('🔧 Setting up Supabase database schema...');

  try {
    // Check existing tables
    console.log('\n1. Checking existing tables...');
    
    // Test keywords table (already exists)
    const { data: keywordsTest, error: keywordsError } = await supabase
      .from('keywords')
      .select('*')
      .limit(1);
    
    if (!keywordsError) {
      console.log('✅ keywords table exists');
    }

    // Test keyword_opportunities table
    console.log('\n2. Testing keyword_opportunities table...');
    const { data: opportunitiesTest, error: opportunitiesError } = await supabase
      .from('keyword_opportunities')
      .select('*')
      .limit(1);
    
    if (opportunitiesError) {
      console.log('❌ keyword_opportunities table missing:', opportunitiesError.message);
      console.log('📝 You need to create this table in Supabase dashboard');
      console.log('\nSQL to run in Supabase SQL Editor:');
      console.log(`
CREATE TABLE keyword_opportunities (
  id SERIAL PRIMARY KEY,
  keyword TEXT NOT NULL,
  search_volume INTEGER DEFAULT 0,
  keyword_difficulty INTEGER DEFAULT 0,
  cpc DECIMAL(10,2) DEFAULT 0,
  competition TEXT CHECK (competition IN ('low', 'medium', 'high')),
  intent TEXT CHECK (intent IN ('informational', 'commercial', 'navigational', 'transactional')),
  seasonality TEXT CHECK (seasonality IN ('stable', 'seasonal', 'trending')),
  related_keywords TEXT[],
  competitor_urls TEXT[],
  content_gaps TEXT[],
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(keyword)
);

-- Add RLS policy
ALTER TABLE keyword_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON keyword_opportunities
FOR ALL USING (true);
      `);
    } else {
      console.log('✅ keyword_opportunities table exists');
    }

    // Test wine_pages table
    console.log('\n3. Testing wine_pages table...');
    const { data: pagesTest, error: pagesError } = await supabase
      .from('wine_pages')
      .select('*')
      .limit(1);
    
    if (pagesError) {
      console.log('❌ wine_pages table missing:', pagesError.message);
      console.log('📝 You need to create this table in Supabase dashboard');
      console.log('\nSQL to run in Supabase SQL Editor:');
      console.log(`
CREATE TABLE wine_pages (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  keywords TEXT[],
  h2_structure TEXT[],
  structured_data JSONB,
  search_volume INTEGER DEFAULT 0,
  keyword_difficulty INTEGER DEFAULT 0,
  quality_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS policy
ALTER TABLE wine_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON wine_pages
FOR ALL USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wine_pages_updated_at BEFORE UPDATE ON wine_pages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    } else {
      console.log('✅ wine_pages table exists');
    }

    // Test email_subscribers table  
    console.log('\n4. Testing email_subscribers table...');
    const { data: emailTest, error: emailError } = await supabase
      .from('email_subscribers')
      .select('*')
      .limit(1);
    
    if (emailError) {
      console.log('❌ email_subscribers table missing:', emailError.message);
      console.log('📝 You need to create this table in Supabase dashboard');
      console.log('\nSQL to run in Supabase SQL Editor:');
      console.log(`
CREATE TABLE email_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT,
  lead_magnet TEXT,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  metadata JSONB
);

-- Add RLS policy
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON email_subscribers
FOR ALL USING (true);
      `);
    } else {
      console.log('✅ email_subscribers table exists');
    }

    console.log('\n📋 Database setup complete!');
    console.log('\n🔗 Next steps:');
    console.log('1. Go to your Supabase dashboard: https://app.supabase.com/project/nsyubkcfsrsowgefkbii');
    console.log('2. Click "SQL Editor" in the sidebar');
    console.log('3. Run the SQL commands shown above for any missing tables');
    console.log('4. Run this script again to verify setup');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
  }
}

setupDatabase();