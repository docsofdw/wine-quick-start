# Wine Quick Start - Development Log

## Session: January 7, 2026

### Overview
Major UI overhaul and content generation infrastructure buildout for the Wine Quick Start pSEO site. This session focused on branding consistency, scalable article generation, and fixing frontend article discovery.

---

## Completed Work

### 1. UI Color Palette Overhaul (Purple → Wine/Burgundy)

**Problem:** The site had purple accent colors that didn't align with the wine brand identity.

**Solution:** Created a comprehensive wine color palette and updated all components.

**Files Modified:**
- `tailwind.config.mjs` - Added custom wine color palette (50-950 shades)
- `src/layouts/BaseLayout.astro` - Updated navbar, footer, mobile menu
- `src/styles/global.css` - Changed all purple references to wine colors
- `src/pages/index.astro` - Homepage hero, cards, links
- `src/pages/wine-pairings/index.astro` - Hero, filters, badges
- `src/pages/learn/index.astro` - All color references
- `src/pages/buy/index.astro` - All color references
- `src/pages/contact.astro` - Form focus states, hero, links

**Wine Color Palette:**
```javascript
wine: {
  50: '#fdf2f4',   // Lightest - backgrounds
  100: '#fce8eb',  // Light backgrounds
  200: '#f9d0d9',  // Borders, subtle accents
  300: '#f4a9ba',  // Light accents
  400: '#ec7994',  // Medium accents
  500: '#dc4b6f',  // Primary accent
  600: '#c42d54',  // Buttons, links
  700: '#a52145',  // Hover states
  800: '#8a1e3d',  // Dark accents
  900: '#751c38',  // Very dark
  950: '#420a1c',  // Darkest - footer, dark sections
}
```

---

### 2. Article Generation Infrastructure

#### 2a. Wine Varieties Generator
**File Created:** `src/scripts/generate-varieties.ts`

**Purpose:** Programmatically generate SEO-optimized wine variety articles with real wine data.

**Varieties Generated (8 articles):**
| Variety | Search Volume | Wine Type |
|---------|--------------|-----------|
| Merlot | 90,500/mo | Red |
| Sauvignon Blanc | 74,000/mo | White |
| Riesling | 60,500/mo | White |
| Malbec | 49,500/mo | Red |
| Zinfandel | 40,500/mo | Red |
| Prosecco | 110,000/mo | Sparkling |
| Rosé Wine | 49,500/mo | Rosé |
| Syrah | 33,100/mo | Red |

**Features:**
- Pulls real wine recommendations from Supabase catalog
- Includes author attribution (E-E-A-T signals)
- Auto-generates structured data (schema.org)
- Creates internal linking relationships
- Includes tasting notes, food pairings, buying tips

**Location:** Articles saved to `src/pages/learn/[variety].astro`

---

#### 2b. Food Pairings Generator
**File Created:** `src/scripts/generate-food-pairings.ts`

**Purpose:** Generate high-intent "wine with [food]" pairing articles.

**Pairings Generated (12 articles):**
| Keyword | Search Volume | Wine Type | Top Pairings |
|---------|--------------|-----------|--------------|
| wine with cheese | 14,800/mo | Red | Cabernet, Port, Sauternes |
| wine with steak | 12,100/mo | Red | Cabernet, Malbec, Syrah |
| wine with chicken | 8,100/mo | White | Chardonnay, Pinot Grigio, Sauv Blanc |
| wine with pasta | 6,600/mo | Red | Chianti, Barbera, Sangiovese |
| wine with pizza | 5,400/mo | Red | Chianti, Montepulciano, Lambrusco |
| wine with fish | 4,400/mo | White | Sauv Blanc, Chablis, Vermentino |
| wine with turkey | 4,400/mo | Red | Pinot Noir, Beaujolais, Zinfandel |
| wine with lamb | 3,600/mo | Red | Bordeaux, Rioja, Côtes du Rhône |
| wine with pork | 2,900/mo | White | Riesling, Pinot Gris, Chenin Blanc |
| wine with sushi | 2,900/mo | White | Champagne, Grüner Veltliner, Dry Riesling |
| wine with seafood | 2,400/mo | White | Muscadet, Albariño, Verdicchio |
| wine with tacos | 1,900/mo | Red | Malbec, Garnacha, Tempranillo |

**Features:**
- Expert sommelier recommendations
- Preparation-specific pairing tips
- "Wines to avoid" section
- Real wine product recommendations with links
- Author bio and credentials

**Location:** Articles saved to `src/pages/wine-pairings/[pairing].astro`

---

### 3. Dynamic Index Page Discovery

**Problem:** Index pages had hardcoded article lists, so new generated articles weren't appearing.

**Solution:** Updated all section index pages to use `Astro.glob()` for automatic article discovery.

#### Updated Files:

**`src/pages/wine-pairings/index.astro`**
- Uses `Astro.glob('./*.astro')` to find all articles
- Auto-categorizes by food type or wine type
- Categories: Meat, Poultry, Seafood, Italian, Cheese, Mexican, Red Wine, White Wine, Sparkling, Rosé, Natural, Orange Wine

**`src/pages/learn/index.astro`**
- Dynamic discovery of all learn articles
- Categories: Wine Regions, Natural Wine, Orange Wine, Sparkling, Best Picks, Reviews, Beginners, Wine Guide
- Shows dynamic article count in hero

**`src/pages/buy/index.astro`**
- Dynamic discovery of all buy articles
- Categories: Natural Wine, Orange Wine, Budget, Mid-Range, Price Guide, Buying Guide
- Includes price range badges on cards

**Key Helper Functions:**
```typescript
// Extract frontmatter from Astro files
function extractFrontmatter(file: AstroFile): any {
  return file.frontmatter || file.default?.frontmatter || {};
}

// Auto-categorize based on title/slug content
function categorizeArticle(title: string, slug: string): string {
  const lower = title.toLowerCase() + ' ' + slug.toLowerCase();
  if (lower.includes('natural wine')) return 'Natural Wine';
  // ... more category logic
}
```

---

### 4. Bug Fixes

#### 4a. Internal Linking Null Check
**File:** `src/lib/internal-linking.ts`

**Problem:** `article.varieties is not iterable` error during article generation.

**Fix:** Added null checks around all array iterations:
```typescript
if (article.keywords) {
  for (const keyword of article.keywords) { ... }
}
if (article.topics) {
  for (const topic of article.topics) { ... }
}
if (article.varieties) {
  for (const variety of article.varieties) { ... }
}
if (article.regions) {
  for (const region of article.regions) { ... }
}
```

#### 4b. CSS Circular Dependency
**File:** `src/styles/global.css`

**Problem:** CSS error with `@apply border` causing build issues.

**Fix:** Changed from Tailwind @apply to raw CSS for border properties:
```css
/* Before (broken): */
@apply border border-gray-100;

/* After (fixed): */
border: 1px solid #f3f4f6;
```

#### 4c. Content Generator Type Mismatch
**File:** `src/scripts/generate-varieties.ts`

**Problem:** `generateVariedContent` expected ContentType but was receiving wine type.

**Fix:** Changed parameter from wine type ('red') to ContentType ('varietal').

---

## Current Site Structure

```
src/pages/
├── index.astro                    # Homepage
├── contact.astro                  # Contact form
├── about/
│   └── [slug].astro              # Author pages (3 authors)
├── learn/
│   ├── index.astro               # Dynamic index (auto-discovers)
│   ├── merlot.astro              # NEW
│   ├── sauvignon-blanc.astro     # NEW
│   ├── riesling.astro            # NEW
│   ├── malbec.astro              # NEW
│   ├── zinfandel.astro           # NEW
│   ├── prosecco.astro            # NEW
│   ├── rose-wine.astro           # NEW
│   ├── syrah.astro               # NEW
│   └── [existing articles...]
├── buy/
│   ├── index.astro               # Dynamic index (auto-discovers)
│   └── [existing articles...]
└── wine-pairings/
    ├── index.astro               # Dynamic index (auto-discovers)
    ├── wine-with-steak.astro     # NEW
    ├── wine-with-chicken.astro   # NEW
    ├── wine-with-pasta.astro     # NEW
    ├── wine-with-pizza.astro     # NEW
    ├── wine-with-fish.astro      # NEW
    ├── wine-with-turkey.astro    # NEW
    ├── wine-with-lamb.astro      # NEW
    ├── wine-with-pork.astro      # NEW
    ├── wine-with-cheese.astro    # NEW
    ├── wine-with-seafood.astro   # NEW
    ├── wine-with-sushi.astro     # NEW
    ├── wine-with-tacos.astro     # NEW
    └── [existing articles...]
```

---

## Commits Made

1. **Color palette and UI updates** - Changed all purple to wine colors
2. **Wine variety articles** - Generated 8 new variety guides
3. **Food pairing articles** - Generated 12 new pairing guides
4. **Dynamic index pages** - Updated all 3 section indexes

---

## Next Steps (Phase 2)

### Content Expansion
- [ ] Generate more wine variety articles (Cabernet Sauvignon, Pinot Noir, Chardonnay, etc.)
- [ ] Create wine region articles (Napa Valley, Bordeaux, Burgundy, Tuscany)
- [ ] Add "best wines under $X" budget articles
- [ ] Create seasonal pairing guides (Thanksgiving wines, Summer wines)

### SEO Improvements
- [ ] Add breadcrumb navigation
- [ ] Implement related articles sidebar
- [ ] Add FAQ schema to key pages
- [ ] Create XML sitemap with priority weighting

### E-E-A-T Enhancements
- [ ] Add more author profiles
- [ ] Include wine certifications/credentials
- [ ] Add "reviewed by" attribution
- [ ] Include data sources and citations

### Technical Improvements
- [ ] Add search functionality
- [ ] Implement wine filtering (by price, type, region)
- [ ] Add "save to favorites" feature
- [ ] Create newsletter signup integration

### Analytics & Tracking
- [ ] Set up conversion tracking
- [ ] Add affiliate link click tracking
- [ ] Implement scroll depth tracking
- [ ] Create content performance dashboard

---

## Running the Generators

To generate more articles in the future:

```bash
# Generate wine variety articles
npx tsx src/scripts/generate-varieties.ts

# Generate food pairing articles
npx tsx src/scripts/generate-food-pairings.ts

# Build to compile new articles
npm run build
```

---

## Environment Requirements

- Node.js 18+
- Supabase connection (for wine catalog data)
- Environment variables in `.env.local`:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

---

*Last updated: January 7, 2026*
