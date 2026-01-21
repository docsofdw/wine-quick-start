# SEO & Content Generation System

## Overview

Wine Quick Start uses an inventory-aligned SEO system that connects keyword research to actual wine catalog data. Every article targets keywords where we have wines to recommend.

## Two-Database Architecture

| Database | Purpose |
|----------|---------|
| **Main Supabase** | Keywords, pages, content tracking |
| **Wine Catalog** | 1,779 wines with varieties, regions, producers |

## Content Pipeline

```
Keywords (340+) → Priority Scoring → Article Generation → AI Enrichment → Published
                         ↑                    ↓
                   Wine Catalog ←──── Wine Recommendations
```

## Keyword System

### keyword_opportunities Table

```sql
keyword           -- Target search term
search_volume     -- Monthly searches
keyword_difficulty -- Competition (0-100)
priority          -- Our ranking (1-10, higher = generate first)
status            -- 'active' | 'used'
```

### Duplicate Detection

The system prevents semantic duplicates by normalizing keywords:
- "wine with chicken" = "chicken-wine-pairing" = "best-wine-with-chicken"
- Only one article per core topic gets generated

## Article Categories

| Category | Path | Content Type |
|----------|------|--------------|
| **Learn** | `/learn/` | Varietals, regions, wine guides |
| **Wine Pairings** | `/wine-pairings/` | Food pairing articles |
| **Buy** | `/buy/` | Price-point guides (under $20, etc.) |

## SEO Features

### Structured Data (JSON-LD)
Every article includes:
- `Article` schema with author info
- `BreadcrumbList` for navigation
- `Organization` and `WebSite` schemas

### Meta Optimization
- Titles: 50-60 characters with keyword
- Descriptions: 150-160 characters
- Canonical URLs
- OpenGraph tags

### Internal Linking
- Automatic related articles (3 per page)
- Contextual links based on topic relevance
- Registry tracks all articles for link suggestions

## Content Enrichment

Thin articles (~300 words) are expanded to 2,000-3,500 words with:

| Section | Content |
|---------|---------|
| History & Origins | Region/varietal background |
| Terroir & Production | Soil, climate, winemaking |
| Tasting Profile | Aromas, flavors, structure |
| Food Pairing | Specific combinations |
| Buying Guide | Producers, price points |
| Expert Tips | Sommelier insights |
| FAQ | Common questions |

## Author System (E-E-A-T)

Three expert authors with credentials:
- **James Thornton** - WSET Level 3, Certified Sommelier
- **Elena Martinez** - WSET Level 2, CSW
- **Michael Chen** - WSET Level 3, Italian Wine Scholar

## Daily Workflow

```bash
# 1. Generate new articles (checks for duplicates automatically)
npx tsx src/scripts/generate-priority-articles.ts

# 2. Enrich thin articles with deep content
npx tsx src/scripts/enrich-articles.ts --thin-only --limit=10

# 3. Build and deploy
npm run build
```

## Key Environment Variables

```env
SUPABASE_URL=           # Main database
SUPABASE_ANON_KEY=      # Main database key
WINE_CATALOG_URL=       # Wine inventory database
WINE_CATALOG_ANON_KEY=  # Wine inventory key
ANTHROPIC_API_KEY=      # Content enrichment
REPLICATE_API_TOKEN=    # AI image generation
```
