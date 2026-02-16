# Scripts Reference

All scripts are in `src/scripts/` and run with `npx tsx`.

## Autonomous Content Pipeline

The pipeline automates article generation, enrichment, and quality assurance with wine catalog integration.

### autonomous-pipeline.ts
Main orchestration script that runs the full content pipeline.

```bash
# Full pipeline run
npm run pipeline

# Dry run (preview without changes)
npm run pipeline:dry

# Generate only (skip enrichment)
npm run pipeline:generate

# Enrich only (skip generation)
npm run pipeline:enrich

# With wine validation
npm run pipeline:validate
```

**Options:**
| Flag | Description |
|------|-------------|
| `--dry-run` | Preview only, no file changes |
| `--generate=N` | Generate N articles (default: 2) |
| `--enrich-limit=N` | Enrich up to N articles (default: 3) |
| `--skip-generate` | Skip article generation |
| `--skip-enrich` | Skip enrichment step |
| `--full-scan` | Score all articles (default: incremental on generated set) |
| `--validate-wines` | Validate wines against catalog |
| `--notify` | Send Slack notification |
| `--verbose` | Show detailed output |

**Pipeline Steps:**
1. **Generation** - Creates articles from priority keywords
2. **Scoring** - Scores all articles for quality (0-100)
3. **Enrichment** - Expands low-scoring articles with more content
4. **Wine Validation** - Verifies wine recommendations exist in catalog
5. **Final Scoring** - Re-scores and categorizes for publishing

**Quality Thresholds:**
- 85%+ → Auto-publish ready
- 50-84% → Needs enrichment/review
- <50% → Rejected

---

### qa-score-article.ts
Scores articles on multiple quality dimensions.

```bash
# Score all articles
npm run qa:score

# Score with wine validation
npm run qa:validate-wines

# Output as JSON
npm run qa:score:json

# Score specific article
npx tsx src/scripts/qa-score-article.ts --article=barolo-wine

# Score by category
npx tsx src/scripts/qa-score-article.ts --category=learn
```

**Scoring Dimensions:**
| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| Word Count | 20% | Target: 1500-3000 words |
| Structure | 20% | H2s, quick answer, FAQs |
| SEO | 20% | Meta, schema, internal links |
| Content Quality | 20% | Wine count, no placeholders |
| Technical | 10% | Valid Astro syntax |
| Wine Validity | 10% | Wines exist in catalog (when enabled) |

---

## Content Generation

### generate-priority-articles.ts
Generates new articles from high-priority keywords.

```bash
npx tsx src/scripts/generate-priority-articles.ts

# Generate exactly one keyword
npx tsx src/scripts/generate-priority-articles.ts --keyword="best pinot noir"
```

**Features:**
- Fetches keywords with priority >= 8 from Supabase
- Checks for semantic duplicates (prevents similar topics)
- **Checks wine catalog for matching wines** (skips if none found)
- Generates AI images via Replicate
- Creates .astro files with wine recommendations from catalog
- Marks keywords as "used" after generation
- Supports deterministic single-keyword mode (`--keyword=...`)

**Output:** Up to 10 articles per run

---

### enrich-articles.ts
Expands thin articles with AI-generated SEO content.

```bash
# Enrich only thin articles (< 1500 words)
npx tsx src/scripts/enrich-articles.ts --thin-only --limit=10

# Enrich specific article
npx tsx src/scripts/enrich-articles.ts --article=best-grenache

# Dry run (preview without changes)
npx tsx src/scripts/enrich-articles.ts --dry-run --limit=5

# Filter by category
npx tsx src/scripts/enrich-articles.ts --category=wine-pairings --limit=5

# Skip wine recommendation section
npx tsx src/scripts/enrich-articles.ts --skip-wine-section
```

**Options:**
| Flag | Description |
|------|-------------|
| `--dry-run` | Preview only, no file changes |
| `--limit=N` | Process N articles (default: 5) |
| `--thin-only` | Only articles under 1500 words |
| `--max-words=N` | Custom word count threshold |
| `--category=X` | Filter by learn/wine-pairings/buy |
| `--article=slug` | Process specific article |
| `--skip-wine-section` | Don't add wine recommendations |

**Wine Integration:** Enrichment now uses REAL wines from the catalog, not AI-generated recommendations. If fewer than 3 matching wines exist, the wine section is skipped.

---

### remediate-legacy-articles.ts
Normalizes formatting issues in existing articles (duplicate sections, malformed utility classes, markdown artifacts).

```bash
# Preview changes only
npm run articles:remediate:dry

# Apply remediation
npm run articles:remediate

# Apply for one category
npx tsx src/scripts/remediate-legacy-articles.ts --write --category=learn
```

**Fixes:**
- Deduplicates repeated `More Excellent Options` sections
- Fixes malformed classes (e.g., `font-semibel` -> `font-semibold`)
- Removes broken markdown heading paragraphs (`<p>## ...</p>`)
- Removes empty `Continue Reading` blocks
- Converts markdown bold markers (`**text**`) to `<strong>text</strong>`

---

### refresh-article-wines.ts
Replaces existing wine recommendation sections with catalog-backed wine data.

```bash
# Preview for learn category
npm run articles:wines:refresh:dry -- --category=learn

# Apply for learn category
npm run articles:wines:refresh -- --category=learn

# Apply one article
npx tsx src/scripts/refresh-article-wines.ts --write --slug=barolo-wine
```

**Behavior:**
- Refreshes `Our Top Picks` with 3 catalog-matched wines
- Rebuilds `More Excellent Options` from additional catalog matches
- Removes old duplicated `More Excellent Options` blocks before inserting one canonical section
- Supports legacy heading aliases and normalizes them to `Our Top Picks` / `More Excellent Options`
  - Example aliases: `Expert Recommendations`, `Expert Wine Recommendations`, `Our Top Rosé Picks for Chicken`
- If no catalog matches are found for a page, stale recommendation sections are removed to avoid invalid legacy picks

---

### validate-all-wines.ts
Validates article recommendation wines against the wine catalog.

```bash
# Validate all categories
npx tsx src/scripts/validate-all-wines.ts

# Validate one category with JSON output
npx tsx src/scripts/validate-all-wines.ts --category=wine-pairings --json

# Verbose output
npx tsx src/scripts/validate-all-wines.ts --category=learn --verbose
```

**Behavior:**
- Extracts wine names only from recommendation sections (not full article body headings)
- Supports legacy recommendation heading aliases used in older content
- Uses strict catalog validation via `wineExistsInCatalog()` / `validateWinesInCatalog()`
- `--fix` can remove recommendation sections from flagged files

---

### seed-keywords.ts
Seeds curated keywords to database.

```bash
npx tsx src/scripts/seed-keywords.ts
```

## SEO Enhancement

### enhance-seo.ts
Adds/audits structured data and meta descriptions.

```bash
npx tsx src/scripts/enhance-seo.ts
```

---

### add-internal-links.ts
Injects contextual internal links based on topic relevance.

```bash
npx tsx src/scripts/add-internal-links.ts
```

---

### fix-meta-descriptions.ts
Ensures meta descriptions are 150-160 characters.

```bash
npx tsx src/scripts/fix-meta-descriptions.ts
```

## Analysis & Maintenance

### analyze-keywords.ts
Analyzes keyword_opportunities table stats.

```bash
npx tsx src/scripts/analyze-keywords.ts
```

---

### article-stats.ts
Shows article counts and word counts by category.

```bash
npx tsx src/scripts/article-stats.ts
```

---

### preview-next-articles.ts
Preview which articles would be generated next.

```bash
npx tsx src/scripts/preview-next-articles.ts
```

## Cleanup

### cleanup-duplicate-pages.ts
Removes duplicate article files.

```bash
npx tsx src/scripts/cleanup-duplicate-pages.ts
```

---

### cleanup-orphan-pages.ts
Removes pages without matching keywords.

```bash
npx tsx src/scripts/cleanup-orphan-pages.ts
```

## Database

### execute-schema.ts
Sets up Supabase tables.

```bash
npx tsx src/scripts/execute-schema.ts
```

---

### insert-researched-keywords.ts
Bulk insert keywords from research.

```bash
npx tsx src/scripts/insert-researched-keywords.ts
```

## Wine Catalog

### validate-all-wines.ts
Scans all articles and validates wine recommendations against the catalog.

```bash
# Check catalog health
npm run catalog:health

# Verbose validation with details
npm run catalog:validate

# Fix articles with invalid wines (removes wine sections)
npm run catalog:fix

# Output as JSON
npx tsx src/scripts/validate-all-wines.ts --json > wine-report.json
```

**Options:**
| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |
| `--fix` | Remove wine sections with invalid wines |
| `--category=X` | Only validate specific category |
| `--verbose` | Show detailed output |

---

### test-wine-catalog.ts
Tests wine catalog connection and displays sample data.

```bash
npx tsx src/scripts/test-wine-catalog.ts
```

**Output:**
- Connection status
- Total wine count
- Sample wines
- Variety distribution
- Region distribution

## Telegram Notifications

### telegram-notify.ts
Sends article notifications to Telegram with images and inline action buttons.

```bash
# Send notification for specific article (with image if available)
npm run telegram:notify -- --article=best-pinot-noir

# Send pipeline summary (new articles, scores, etc.)
npm run telegram:test

# Send weekly digest (total articles, word counts, categories)
npm run telegram:digest
```

**Options:**
| Flag | Description |
|------|-------------|
| `--article=slug` | Send notification for specific article |
| `--summary` | Send pipeline summary |
| `--digest` | Send weekly content digest |
| `--log=path` | Use specific log file for summary |

**Notification includes:**
- Featured image (if available)
- Title, keyword, category
- QA score, word count, wine count
- Keep/Delete inline buttons
- Direct link to article

---

### telegram-get-chat-id.ts
Helper script to get your Telegram chat ID during setup.

```bash
npm run telegram:setup
```

**Usage:**
1. Create bot with @BotFather on Telegram
2. Send any message to your bot
3. Run this script to get your chat ID
4. Add chat ID to `.env.local`

---

### telegram-webhook.ts (API endpoint)
Handles button callbacks from Telegram inline keyboards.

**Location:** `src/pages/api/telegram-webhook.ts`

**Supported Actions:**
| Callback | Action |
|----------|--------|
| `keep:slug` | Mark article as kept (updates message) |
| `delete:slug` | Delete article via GitHub API |
| `view_all` | Link to all articles |

**Setup webhook:**
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://winesquickstart.com/api/telegram-webhook"
```

---

## NPM Scripts

### Pipeline Commands
```bash
npm run pipeline              # Full pipeline run
npm run pipeline:dry          # Preview without changes
npm run pipeline:generate     # Generate only
npm run pipeline:enrich       # Enrich only
npm run pipeline:validate     # Validate wines only
```

### QA Commands
```bash
npm run qa:score              # Score all articles
npm run qa:score:json         # Score as JSON
npm run qa:validate-wines     # Score with wine validation
```

### Wine Catalog Commands
```bash
npm run catalog:health        # Quick connection test
npm run catalog:validate      # Full validation report
npm run catalog:fix           # Fix invalid wine sections
```

### Telegram Commands
```bash
npm run telegram:setup        # Get your chat ID
npm run telegram:test         # Send pipeline summary
npm run telegram:digest       # Send weekly digest
npm run telegram:notify -- --article=slug  # Notify specific article
```

### Development Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
```
