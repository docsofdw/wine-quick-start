# Autonomous Content Pipeline

The content pipeline automates article generation, enrichment, and quality assurance with wine catalog integration.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PIPELINE ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   GitHub Actions          autonomous-pipeline.ts             │
│   (Mon/Thu 2pm UTC) ────►  ├── generate-priority-articles   │
│                            ├── qa-score-article              │
│                            ├── enrich-articles               │
│                            └── validate-all-wines            │
│                                      │                       │
│                                      ▼                       │
│                              ┌──────────────┐                │
│                              │   Pull       │                │
│                              │   Request    │                │
│                              └──────────────┘                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Test the pipeline (no changes)
npm run pipeline:dry

# Run full pipeline
npm run pipeline

# Validate wine recommendations
npm run catalog:validate
```

## Pipeline Steps

### Step 1: Keyword Selection

The pipeline fetches unused keywords from `keyword_opportunities` table:

```sql
SELECT * FROM keyword_opportunities
WHERE status = 'active' AND priority >= 7
ORDER BY priority DESC, search_volume DESC
LIMIT 4
```

**Pre-generation Wine Check:**
Before generating an article, the pipeline checks if the wine catalog has matching wines:

```typescript
const wines = await getWinesForKeyword(keyword.keyword, 3);
if (wines.length === 0) {
  result.skipped.push({ slug, reason: 'No matching wines in catalog' });
  continue;
}
```

### Step 2: Article Generation

For each keyword that passes the wine check:

1. **Duplicate Check** - Semantic matching prevents similar topics
2. **Wine Fetch** - Gets REAL wines from catalog (not AI-generated)
3. **Image Generation** - Creates AI image via Replicate
4. **File Creation** - Writes .astro file with wine cards
5. **Status Update** - Marks keyword as "used"

### Step 3: Quality Scoring

Every article is scored 0-100 on multiple dimensions:

| Dimension | Weight | Measures |
|-----------|--------|----------|
| Word Count | 20% | 1500-3000 words = 100% |
| Structure | 20% | H2s, quick answer, FAQs, expert tips |
| SEO | 20% | Meta description, schema, internal links |
| Content Quality | 20% | Wine recommendations, no placeholders |
| Technical | 10% | Valid Astro syntax, imports |
| Wine Validity | 10% | Wines exist in catalog |

### Step 4: Enrichment

Articles scoring below 85% are automatically enriched:

```typescript
const needsEnrichment = allScores
  .filter(s => s.totalScore < 85 && s.totalScore >= 50)
  .sort((a, b) => a.totalScore - b.totalScore)
  .slice(0, enrichLimit);
```

**Enrichment adds:**
- History & Origins section
- Terroir & Climate details
- Tasting profile
- Food pairing guide
- Expert tips (7-8 specific tips)
- FAQs (6-8 questions)
- **More wine recommendations from catalog**

### Step 5: Wine Validation

After enrichment, wines are validated against the catalog:

```typescript
const validation = await validateWinesInCatalog(wineNames);
if (validation.invalid.length > 0) {
  result.flaggedWines.push({
    slug: score.slug,
    invalidWines: validation.invalid,
  });
}
```

### Step 6: Final Decision

| Score | Status | Action |
|-------|--------|--------|
| 85%+ | Publish | Included in PR |
| 50-84% | Review | Flagged for manual review |
| <50% | Reject | Optionally archived |

## Quality Gates

```
Keyword          Article           Enriched          Published
Selection       Generation         Article            Article
    │               │                 │                  │
    ▼               ▼                 ▼                  ▼
┌────────┐    ┌──────────┐     ┌───────────┐     ┌──────────┐
│Duplicate│    │  Wine    │     │   Wine    │     │  Final   │
│  Check  │    │ Coverage │     │ Validity  │     │  Score   │
└────┬───┘    └────┬─────┘     └─────┬─────┘     └────┬─────┘
     │              │                 │                 │
   PASS?          PASS?             PASS?            >= 85%?
     │              │                 │                 │
   ┌─┴─┐          ┌─┴─┐             ┌─┴─┐            ┌─┴─┐
   │YES│          │YES│             │YES│            │YES│
   └─┬─┘          └─┬─┘             └─┬─┘            └─┬─┘
     │              │                 │                 │
     ▼              ▼                 ▼                 ▼
 Continue       Continue          Continue          PUBLISH
                  or                 or
              Skip wines          Flag for
                                   review
```

## Wine Catalog Integration

### Why Real Wines?

The pipeline uses REAL wines from our catalog database instead of AI-generated recommendations:

- **Authenticity** - Readers can actually buy the wines
- **Quality** - No hallucinated producer names
- **SEO Value** - Real wine names get real search traffic
- **Validation** - Every wine can be verified

### How Wine Matching Works

```typescript
// Extract wine-related terms from keyword
const terms = extractWineTerms("best pinot noir under $30");
// → varieties: ["Pinot Noir"]
// → styles: ["value"]

// Search catalog with priority order
// 1. Explicit wine type (if mentioned)
// 2. Appellation name (Barbaresco, Barolo, etc.)
// 3. Grape variety
// 4. Region
// 5. Full-text search
const wines = await getWinesForKeyword(keyword, 5);
```

**Matching/Validation Notes (2026-02 updates):**
- `wineExistsInCatalog()` now checks a cached normalized catalog-name index first for exact/near-exact display-name matches.
- Fallback search avoids unsafe PostgREST `.or(...)` query construction and uses safe per-field `ilike` lookups.
- Validation scripts scope extraction to recommendation sections only (`Our Top Picks`, `More Excellent Options`, and known legacy aliases).
- Unsupported wine types do not fall back to random recommendations.

### No Matching Wines?

When the catalog has no matching wines:

| Stage | Behavior |
|-------|----------|
| Generation | Skip wine section, create educational article |
| Enrichment | Skip wine recommendations, add other content |
| Validation | Score 100% (no wines to validate) |
| Remediation/Refresh | Removes stale legacy recommendation blocks if they exist |

## Telegram Notifications

The pipeline sends real-time notifications to Telegram when articles are generated.

### Notification Types

#### 1. New Article Notification
Sent for each article generated by the pipeline:

```
🍷 New Article Published

Best Pinot Noir - Expert Guide

📝 Keyword: best pinot noir
📁 Category: learn
📊 QA Score: 87%
📖 Words: 6,995
🍾 Wines: 8 wines

🔗 https://winesquickstart.com/learn/best-pinot-noir

[✅ Keep] [🗑 Delete]
[🔗 View Article]
```

**Features:**
- **Featured image** attached (if available)
- **Keep/Delete buttons** for quick moderation
- **View Article** opens the live page
- Delete button removes article via GitHub API

#### 2. Weekly Digest
Sent every Sunday with content stats:

```
📊 Weekly Content Digest

Total Articles: 80
Avg Word Count: ~3,848
With Images: ~90%

By Category:
• Learn: 39 articles
• Wine Pairings: 34 articles
• Buy Guides: 7 articles

Pipeline Schedule:
Mon & Thu @ 2pm UTC
```

### Schedule

| Notification | Schedule (UTC) | Hong Kong (UTC+8) |
|--------------|----------------|-------------------|
| New Articles | Mon/Thu 2pm | Mon/Thu 10pm |
| Weekly Digest | Sun 10am | Sun 6pm |

### Setup

1. **Create Telegram Bot:**
   ```bash
   # Message @BotFather on Telegram
   # Send /newbot and follow instructions
   # Copy the token
   ```

2. **Get Your Chat ID:**
   ```bash
   # Send any message to your bot first, then:
   npm run telegram:setup
   ```

3. **Add Environment Variables:**
   ```bash
   # .env.local
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHAT_ID=your_chat_id
   ```

4. **Add GitHub Secrets:**
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`

5. **Add Vercel Environment Variables:**
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `GITHUB_TOKEN` (for delete functionality)

6. **Set Webhook (for delete button):**
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://winesquickstart.com/api/telegram-webhook"
   ```

### Commands

```bash
# Send notification for specific article
npm run telegram:notify -- --article=best-pinot-noir

# Send pipeline summary
npm run telegram:test

# Send weekly digest
npm run telegram:digest

# Get chat ID (setup helper)
npm run telegram:setup
```

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                 TELEGRAM NOTIFICATION FLOW                    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Pipeline Complete                                            │
│        │                                                      │
│        ▼                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │   Summary   │───►│  Article 1  │───►│  Article 2  │       │
│  │   Message   │    │  + Image    │    │  + Image    │       │
│  └─────────────┘    └─────────────┘    └─────────────┘       │
│                            │                                  │
│                            ▼                                  │
│                     User clicks button                        │
│                            │                                  │
│              ┌─────────────┼─────────────┐                   │
│              ▼             ▼             ▼                    │
│         [Keep]        [Delete]      [View]                   │
│            │              │             │                     │
│            ▼              ▼             ▼                     │
│        Mark as       GitHub API     Open URL                 │
│        reviewed      delete file                             │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Files

| File | Purpose |
|------|---------|
| `src/scripts/telegram-notify.ts` | Send notifications |
| `src/scripts/telegram-get-chat-id.ts` | Setup helper |
| `src/pages/api/telegram-webhook.ts` | Handle button callbacks |

---

## GitHub Actions Workflow

### Schedule

| Cron | Job | Purpose |
|------|-----|---------|
| `0 14 * * 1,4` | content-pipeline | Generate & enrich (Mon/Thu 2pm UTC) |
| `0 2 * * *` | catalog-health | Daily catalog connection check |
| `0 10 * * 0` | weekly-digest | Send Telegram digest (Sun 10am UTC) |

### Manual Trigger

The workflow can be triggered manually with options:

```yaml
workflow_dispatch:
  inputs:
    generate_count: '2'      # Articles to generate
    enrich_limit: '3'        # Max enrichments
    dry_run: false           # Preview mode
    skip_generate: false     # Skip generation
    validate_wines: true     # Validate wine catalog
```

### Required Secrets

```
# Database
SUPABASE_URL
SUPABASE_ANON_KEY
WINE_CATALOG_URL
WINE_CATALOG_ANON_KEY

# AI Services
ANTHROPIC_API_KEY
REPLICATE_API_TOKEN

# Notifications
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
SLACK_WEBHOOK_URL (optional)
```

## Commands Reference

### Pipeline Commands

```bash
# Full pipeline
npm run pipeline

# Dry run (preview)
npm run pipeline:dry

# Generate only
npm run pipeline:generate

# Enrich only
npm run pipeline:enrich

# Validate wines only
npm run pipeline:validate
```

### QA Commands

```bash
# Score all articles
npm run qa:score

# Score as JSON
npm run qa:score:json

# Score with wine validation
npm run qa:validate-wines
```

### Wine Catalog Commands

```bash
# Quick connection test
npm run catalog:health

# Full validation report
npm run catalog:validate

# Fix invalid wine sections
npm run catalog:fix
```

### Telegram Commands

```bash
# Send notification for article
npm run telegram:notify -- --article=slug

# Send pipeline summary
npm run telegram:test

# Send weekly digest
npm run telegram:digest

# Get chat ID (setup)
npm run telegram:setup
```

## Troubleshooting

### "No matching wines in catalog"

The keyword doesn't match any wines in our catalog.

**Solutions:**
1. Add matching wines to the catalog
2. Let the pipeline generate an educational article (no wine picks)
3. Skip the keyword manually

### "Wine catalog connection failed"

Cannot connect to the wine catalog database.

**Check:**
1. `WINE_CATALOG_URL` is set correctly
2. `WINE_CATALOG_ANON_KEY` is valid
3. Network access to Supabase

```bash
npm run catalog:health
```

### "X wines not found in catalog"

The enrichment added AI-generated wines that don't exist.

**This shouldn't happen with the new pipeline.** If it does:
1. Run `npm run catalog:validate` to see all invalid wines
2. Run `npm run catalog:fix` to remove invalid sections
3. Check that enrichment is using `getAdditionalWinesForArticle()`

### Low QA scores

Articles scoring below 80% need improvement.

**Common issues:**
- Word count too low (< 1500 words)
- Missing FAQ section
- Missing expert tips
- Few internal links

**Solution:** Run enrichment on specific article:
```bash
npx tsx src/scripts/enrich-articles.ts --article=slug-name
```

## Architecture Files

| File | Purpose |
|------|---------|
| `src/scripts/autonomous-pipeline.ts` | Main orchestration |
| `src/scripts/qa-score-article.ts` | Quality scoring |
| `src/scripts/enrich-articles.ts` | Content enrichment |
| `src/scripts/validate-all-wines.ts` | Wine validation |
| `src/lib/wine-catalog.ts` | Catalog integration |
| `src/scripts/telegram-notify.ts` | Telegram notifications |
| `src/scripts/telegram-get-chat-id.ts` | Telegram setup helper |
| `src/pages/api/telegram-webhook.ts` | Telegram button handler |
| `.github/workflows/content-pipeline.yml` | CI/CD workflow |
