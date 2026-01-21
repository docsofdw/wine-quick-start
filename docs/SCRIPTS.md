# Scripts Reference

All scripts are in `src/scripts/` and run with `npx tsx`.

## Content Generation

### generate-priority-articles.ts
Generates new articles from high-priority keywords.

```bash
npx tsx src/scripts/generate-priority-articles.ts
```

**Features:**
- Fetches keywords with priority >= 8 from Supabase
- Checks for semantic duplicates (prevents similar topics)
- Generates AI images via Replicate
- Creates .astro files with wine recommendations
- Marks keywords as "used" after generation

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

## NPM Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run wine:daily   # Generate daily content batch
npm run seed:keywords # Seed keywords to database
```
