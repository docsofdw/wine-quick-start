# Site Architecture

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Astro 5.x (SSR) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Images | Replicate (Flux AI) |
| Content AI | Anthropic Claude |
| Hosting | Vercel |

## Project Structure

```
wine-quick-start/
├── src/
│   ├── pages/              # Astro pages (routes)
│   │   ├── learn/          # Wine education articles
│   │   ├── wine-pairings/  # Food pairing articles
│   │   ├── buy/            # Price-point guides
│   │   ├── about/          # Author pages
│   │   └── api/            # API endpoints
│   ├── layouts/
│   │   ├── BaseLayout.astro    # Site-wide layout
│   │   └── ArticleLayout.astro # Article template
│   ├── components/         # Reusable UI components
│   ├── lib/                # Core functionality
│   │   ├── wine-catalog.ts     # Wine database client
│   │   ├── internal-linking.ts # Link suggestions
│   │   └── content-enrichment-templates.ts
│   ├── data/
│   │   └── authors.ts      # Author profiles & credentials
│   ├── scripts/            # Automation scripts
│   └── assets/
│       └── images/articles/ # AI-generated images
├── docs/                   # Documentation
└── public/                 # Static assets
```

## Page Structure

### Article Layout

```
┌─────────────────────────────────────┐
│ Header / Navigation                 │
├─────────────────────────────────────┤
│ Breadcrumbs                         │
├───────────────────────┬─────────────┤
│                       │ TOC         │
│ Author Attribution    │ (sticky)    │
│                       │             │
│ Quick Answer Box      │             │
│                       │             │
│ Main Content          │             │
│ - h2 sections         │             │
│ - Wine recommendations│             │
│ - Expert tips         │             │
│ - FAQs                │             │
│                       │             │
│ Related Articles      │             │
│                       │             │
│ Author Bio            │             │
├───────────────────────┴─────────────┤
│ Footer                              │
└─────────────────────────────────────┘
```

## Database Schema

### keyword_opportunities
Tracks SEO keywords and their status.

| Column | Type | Purpose |
|--------|------|---------|
| keyword | TEXT | Target search term |
| search_volume | INT | Monthly searches |
| keyword_difficulty | INT | Competition score |
| priority | INT | Generation priority (1-10) |
| status | TEXT | 'active' or 'used' |
| used_at | TIMESTAMP | When article was generated |

### wine_pages
Tracks generated article metadata.

| Column | Type | Purpose |
|--------|------|---------|
| slug | TEXT | URL path |
| title | TEXT | Article title |
| keywords | TEXT[] | Target keywords |
| h2_structure | TEXT[] | Section headings |

## Content Flow

```
1. Keyword Research
   └── Supabase: keyword_opportunities (status: active)

2. Article Generation
   ├── Check duplicates (semantic matching)
   ├── Fetch wine recommendations from catalog
   ├── Generate AI image (Replicate)
   ├── Create .astro file
   └── Mark keyword as "used"

3. Content Enrichment
   ├── Identify thin articles (< 1500 words)
   ├── Generate sections via Claude API
   ├── Insert into article structure
   └── Update read time

4. SEO Enhancement
   ├── Add structured data (JSON-LD)
   ├── Optimize meta descriptions
   └── Inject internal links

5. Build & Deploy
   └── Vercel auto-deploys on push
```

## Image System

### AI Generation (Replicate)
- Model: `black-forest-labs/flux-schnell`
- Aspect ratio: 16:9
- Format: PNG
- Context-aware prompts (champagne, food pairings, regions)

### Storage
- Path: `src/assets/images/articles/{slug}.png`
- Optimized via Astro's Sharp integration
- Responsive sizes: 400, 800, 1200px

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/cron/daily` | Vercel cron for daily generation |
| `/api/newsletter` | Email subscription handler |

## Environment Variables

```env
# Required
SUPABASE_URL=
SUPABASE_ANON_KEY=
WINE_CATALOG_URL=
WINE_CATALOG_ANON_KEY=

# Content Generation
ANTHROPIC_API_KEY=
REPLICATE_API_TOKEN=

# Optional (keyword research)
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=
```
