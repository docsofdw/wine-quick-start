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

## Autonomous Content Pipeline

The content pipeline runs automatically via GitHub Actions (Mon/Thu 2pm UTC) or manually.

```
┌─────────────────────────────────────────────────────────────┐
│                 AUTONOMOUS CONTENT PIPELINE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. KEYWORD SELECTION                                        │
│     ├── Fetch priority >= 7 keywords from Supabase          │
│     ├── Check for semantic duplicates                        │
│     └── PRE-CHECK: Verify wines exist in catalog ────────┐  │
│                                                           │  │
│  2. ARTICLE GENERATION                                    │  │
│     ├── Generate AI image (Replicate)                     │  │
│     ├── Fetch REAL wines from catalog ◄──────────────────┘  │
│     ├── Create .astro file with wine cards                   │
│     └── Mark keyword as "used"                               │
│                                                              │
│  3. QA SCORING (0-100)                                       │
│     ├── Word count (20%)                                     │
│     ├── Structure (20%)                                      │
│     ├── SEO elements (20%)                                   │
│     ├── Content quality (20%)                                │
│     ├── Technical validity (10%)                             │
│     └── Wine validity (10%) ─── Checks catalog               │
│                                                              │
│  4. ENRICHMENT (if score < 85%)                              │
│     ├── Generate sections via Claude API                     │
│     ├── Add REAL wines from catalog (not AI picks)          │
│     └── POST-CHECK: Validate all wines exist                 │
│                                                              │
│  5. FINAL DECISION                                           │
│     ├── 85%+ → Published (PR created)                        │
│     ├── 50-84% → Needs review                                │
│     └── <50% → Rejected/archived                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Quality Gates

| Gate | When | Pass Condition | Fail Action |
|------|------|----------------|-------------|
| Duplicate Check | Pre-gen | Topic not used | Skip keyword |
| Wine Coverage | Pre-gen | Wines exist in catalog | Skip wine section |
| Initial Score | Post-gen | Score >= 50 | Archive article |
| Wine Validity | Post-enrich | All wines in catalog | Flag for review |
| Final Score | Pre-publish | Score >= 85 | Hold in PR |

### GitHub Actions Schedule

| Schedule | Job | Purpose |
|----------|-----|---------|
| Mon/Thu 2pm UTC | content-pipeline | Generate & enrich articles |
| Daily 2am UTC | catalog-health | Verify wine catalog connection |
| Sun 10am UTC | weekly-digest | Send Telegram digest |

## Legacy Content Flow

For manual operations outside the pipeline:

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
   ├── Fetch REAL wines from catalog
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
| GitHub Actions (`.github/workflows/content-pipeline.yml`) | Scheduled content automation (cron owner) |
| `/api/newsletter` | Email subscription handler |

## Wine Catalog Integration

The wine catalog is a separate Supabase database containing real wine data from partners.

### Why Real Wines?

- **Authenticity** - Readers can actually find and buy recommended wines
- **Quality Control** - No AI-hallucinated wine names or producers
- **SEO Benefit** - Real wines = real search traffic
- **Partner Integration** - Links to actual retailers

### Wine Matching Flow

```
Keyword: "best pinot noir"
        │
        ▼
┌─────────────────┐
│ Extract Terms   │ → varieties: ["Pinot Noir"]
│                 │ → regions: ["Burgundy", "Oregon"]
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Search Catalog  │ → Priority: variety > region > type
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Filter Results  │ → Remove duplicates
│                 │ → Exclude existing article wines
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate Cards  │ → Name, region, tasting notes
└─────────────────┘
```

### No Matching Wines?

If no wines match the keyword topic:
- **Generation**: Skip wine recommendation section (article still created)
- **Enrichment**: Skip wine enrichment (other content still added)
- **Validation**: Score 100% (no wines = nothing to validate)

### Key Functions

| Function | Purpose |
|----------|---------|
| `getWinesForKeyword()` | Get wines for article generation |
| `getAdditionalWinesForArticle()` | Get wines for enrichment (excludes existing) |
| `validateWinesInCatalog()` | Validate wine names exist |
| `wineExistsInCatalog()` | Check single wine |

## Environment Variables

```env
# Required - Main database
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Required - Wine catalog database
WINE_CATALOG_URL=
WINE_CATALOG_ANON_KEY=

# Content Generation
ANTHROPIC_API_KEY=
REPLICATE_API_TOKEN=

# Notifications (optional)
SLACK_WEBHOOK_URL=

# Optional (keyword research)
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=
```
