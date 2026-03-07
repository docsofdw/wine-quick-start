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

-- Pipeline Runs Table
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id BIGSERIAL PRIMARY KEY,
  run_identifier TEXT UNIQUE NOT NULL,
  trigger_type TEXT NOT NULL,
  run_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  commit_sha TEXT,
  source_branch TEXT,
  generated_articles INTEGER DEFAULT 0,
  enriched_articles INTEGER DEFAULT 0,
  publish_ready_articles INTEGER DEFAULT 0,
  rejected_articles INTEGER DEFAULT 0,
  flagged_wine_articles INTEGER DEFAULT 0,
  avg_score NUMERIC(5,2),
  error_count INTEGER DEFAULT 0,
  result_json JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_started_at ON pipeline_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_trigger_type ON pipeline_runs(trigger_type);

ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_runs'
      AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" ON pipeline_runs
    FOR ALL USING (true);
  END IF;
END $$;

-- Pipeline Article Outcomes Table
CREATE TABLE IF NOT EXISTS pipeline_article_outcomes (
  id BIGSERIAL PRIMARY KEY,
  pipeline_run_id BIGINT REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  run_identifier TEXT NOT NULL,
  slug TEXT NOT NULL,
  keyword TEXT,
  category TEXT,
  outcome TEXT NOT NULL,
  reason TEXT,
  qa_score NUMERIC(5,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_article_outcomes_run_id ON pipeline_article_outcomes(pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_article_outcomes_slug ON pipeline_article_outcomes(slug);
CREATE INDEX IF NOT EXISTS idx_pipeline_article_outcomes_outcome ON pipeline_article_outcomes(outcome);

ALTER TABLE pipeline_article_outcomes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_article_outcomes'
      AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" ON pipeline_article_outcomes
    FOR ALL USING (true);
  END IF;
END $$;

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
