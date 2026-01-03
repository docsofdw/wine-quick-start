-- Wine Pages Table
CREATE TABLE wine_pages (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  h2_structure TEXT[] DEFAULT '{}',
  structured_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'published'
);

-- Keyword Opportunities Table
CREATE TABLE keyword_opportunities (
  id SERIAL PRIMARY KEY,
  keyword TEXT UNIQUE NOT NULL,
  search_volume INTEGER DEFAULT 0,
  keyword_difficulty INTEGER DEFAULT 0,
  cpc DECIMAL(10,2) DEFAULT 0,
  competition TEXT DEFAULT 'medium',
  intent TEXT DEFAULT 'informational',
  seasonality TEXT DEFAULT 'stable',
  related_keywords TEXT[] DEFAULT '{}',
  competitor_urls TEXT[] DEFAULT '{}',
  content_gaps TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ NULL,
  status TEXT DEFAULT 'active'
);

-- Create indexes for better performance
CREATE INDEX idx_wine_pages_slug ON wine_pages(slug);
CREATE INDEX idx_wine_pages_status ON wine_pages(status);
CREATE INDEX idx_keyword_opportunities_priority ON keyword_opportunities(priority DESC);
CREATE INDEX idx_keyword_opportunities_status ON keyword_opportunities(status);
CREATE INDEX idx_keyword_opportunities_search_volume ON keyword_opportunities(search_volume DESC); 
-- Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  source TEXT DEFAULT 'website',
  ip_address TEXT,
  user_agent TEXT
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers(status);

