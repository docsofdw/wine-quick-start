# Wine Quick Start - SEO Keyword System

**Date:** January 14, 2026
**Status:** Complete and Operational

---

## Summary

Built an inventory-aligned SEO keyword research and content generation system that connects the wine catalog database (`cellarsofdw`) with the keyword opportunities database to ensure every article targets keywords we can actually monetize.

---

## What Was Built

### 1. Two-Database Architecture

| Database | Project | Purpose |
|----------|---------|---------|
| Main Supabase | `nsyubkcfsrsowgefkbii` | Keywords, pages, content |
| Wine Catalog | `rzlzpqsuruoseseohsxv` (cellarsofdw) | Real wine inventory |

### 2. Wine Catalog Inventory

| Metric | Count |
|--------|-------|
| **Total Wines** | 1,779 |
| **Unique Regions** | 17 |
| **Unique Varieties** | 93 |
| **Unique Producers** | 184 |

**Top Inventory by Category:**

**Regions:**
- California: 149 wines
- Bordeaux: 36 wines
- Burgundy: 21 wines
- Piedmont: 16 wines
- Champagne: 16 wines

**Varieties:**
- Chardonnay: 166 wines
- Pinot Noir: 120 wines
- Cabernet Sauvignon: 112 wines
- Grenache: 63 wines
- Sauvignon Blanc: 54 wines

**Notable Producers:**
- Bedrock Wine Co. (13)
- Turley (12)
- Sine Qua Non (9)
- Kosta Browne (9)
- DRC, Scarecrow, Ridge, First Growth Bordeaux

### 3. Keyword Research Completed

| Phase | Keywords Added | Description |
|-------|---------------|-------------|
| Variety Keywords | 76 | Mapped to grape varieties in inventory |
| Region Keywords | 47 | Mapped to wine regions in inventory |
| Cult/Producer Keywords | 28 | Premium producer searches |
| Food Pairing Keywords | 41 | Mapped to wine types for recommendations |
| **Total** | **192** | All inventory-aligned |

**Database Stats After Research:**

| Metric | Before | After |
|--------|--------|-------|
| Total Keywords | 161 | 340 |
| High-Volume (10K+) | 2 | 15+ |
| Priority 10 Keywords | ~5 | 25+ |

### 4. Top 15 Keywords by Volume

| Keyword | Volume/mo | Inventory Match |
|---------|-----------|-----------------|
| champagne wine | 33,000 | 16 wines |
| best champagne | 28,000 | 16 wines |
| bordeaux wine | 27,000 | 36 wines |
| burgundy wine | 24,000 | 21 wines |
| thanksgiving wine pairing | 22,200 | 120 Pinot Noirs |
| napa valley wine | 22,000 | 149 California |
| barolo wine | 18,500 | 16 Piedmont |
| wine with turkey | 18,100 | 120 Pinot Noirs |
| best cabernet sauvignon | 18,100 | 112 wines |
| california wine | 18,000 | 149 wines |
| best pinot noir | 14,800 | 120 wines |
| wine with steak | 14,800 | 112 Cabernets |
| best wine for thanksgiving | 14,800 | 120 Pinot Noirs |
| sonoma wine | 14,000 | 149 California |
| cotes du rhone | 14,500 | 8 Rhone |

### 5. Articles Generated

Generated 10 new articles for top priority keywords:

| Article | Keyword Volume | Category |
|---------|----------------|----------|
| champagne-wine.astro | 33,000/mo | learn |
| best-champagne.astro | 28,000/mo | learn |
| bordeaux-wine.astro | 27,000/mo | learn |
| burgundy-wine.astro | 24,000/mo | learn |
| thanksgiving-wine-pairing.astro | 22,200/mo | wine-pairings |
| napa-valley-wine.astro | 22,000/mo | learn |
| barolo-wine.astro | 18,500/mo | learn |
| best-cabernet-sauvignon.astro | 18,100/mo | learn |
| california-wine.astro | 18,000/mo | learn |
| best-pinot-noir.astro | 14,800/mo | learn |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CONTENT PIPELINE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────┐ │
│  │ Wine Catalog │      │   Keyword    │      │  Article   │ │
│  │  (1,779)     │─────►│ Opportunities│─────►│ Generation │ │
│  │              │      │   (340)      │      │            │ │
│  └──────────────┘      └──────────────┘      └────────────┘ │
│        │                      │                     │       │
│        │                      │                     │       │
│        ▼                      ▼                     ▼       │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────┐ │
│  │  Varieties   │      │   Priority   │      │   Astro    │ │
│  │  Regions     │      │   Scoring    │      │   Pages    │ │
│  │  Producers   │      │   (1-10)     │      │            │ │
│  └──────────────┘      └──────────────┘      └────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Scripts Created

### Analysis Scripts

| Script | Purpose |
|--------|---------|
| `analyze-keywords.ts` | Analyze keyword_opportunities table |
| `insert-researched-keywords.ts` | Bulk insert researched keywords |
| `generate-priority-articles.ts` | Generate articles for top keywords |

### Usage

```bash
# Analyze current keywords
npx tsx src/scripts/analyze-keywords.ts

# Insert new keywords (edit array in file first)
npx tsx src/scripts/insert-researched-keywords.ts

# Generate articles for top priority keywords
npx tsx src/scripts/generate-priority-articles.ts

# Run daily automation (existing)
npm run wine:daily
```

---

## Keyword-to-Inventory Mapping

Every keyword is now mapped to actual wines in the catalog:

| Keyword Type | Inventory Match | Example |
|--------------|-----------------|---------|
| "best chardonnay" | Chardonnay variety | 166 wines |
| "napa valley wine" | California region | 149 wines |
| "wine with steak" | Cabernet Sauvignon | 112 wines |
| "turley zinfandel" | Turley producer | 12 wines |
| "thanksgiving pairing" | Pinot Noir | 120 wines |

---

## Moving Forward

### Daily Operations

1. **Add wines to catalog** → System can now suggest keywords
2. **Run `generate-priority-articles.ts`** → Creates articles for unused keywords
3. **Keywords auto-marked "used"** → Prevents duplicates

### Quarterly Maintenance

1. **Re-run keyword research** to find new opportunities
2. **Update volumes** for seasonal keywords (Thanksgiving, Christmas)
3. **Add new inventory mappings** as catalog grows

### Key Env Variables

```env
# Main database
SUPABASE_URL=https://nsyubkcfsrsowgefkbii.supabase.co
SUPABASE_ANON_KEY=***

# Wine catalog (cellarsofdw)
WINE_CATALOG_URL=https://rzlzpqsuruoseseohsxv.supabase.co
WINE_CATALOG_ANON_KEY=***
```

---

## Database Schema

### keyword_opportunities

```sql
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
```

### wine_catalog (cellarsofdw)

```sql
-- External database structure
id, producer, wine_name, vintage, region, subregion,
variety, bottle_size_ml, external_id, is_cult, created_at
```

---

## Results

| Metric | Value |
|--------|-------|
| Keywords researched | 192 new |
| Total keywords in DB | 340 |
| Articles generated | 10 |
| Total search volume potential | 500K+/mo |
| All keywords inventory-mapped | Yes |

---

**System Status: Operational**

The keyword research and content generation pipeline is now fully connected to your wine inventory. Every article targets keywords where you have wines to recommend.
