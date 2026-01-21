# Wine Quick Start

SEO-optimized wine education site with automated content generation.

**Live Site:** [winequickstart.com](https://winequickstart.com)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Generate new articles
npx tsx src/scripts/generate-priority-articles.ts

# Enrich thin articles with deep content
npx tsx src/scripts/enrich-articles.ts --thin-only --limit=10

# Build for production
npm run build
```

## Features

- **Automated Content Generation** - AI-powered article creation with wine recommendations
- **SEO Optimization** - Structured data, meta optimization, internal linking
- **AI Images** - Replicate/Flux generates featured images
- **Inventory-Aligned** - Articles target keywords matching wine catalog
- **Duplicate Prevention** - Semantic matching prevents similar topic articles

## Documentation

| Document | Description |
|----------|-------------|
| [SEO System](docs/SEO-SYSTEM.md) | Content generation & SEO pipeline |
| [Scripts](docs/SCRIPTS.md) | All automation scripts reference |
| [Architecture](docs/ARCHITECTURE.md) | Site structure & tech stack |

## Project Structure

```
src/
├── pages/           # Article pages by category
│   ├── learn/       # Wine education (varietals, regions)
│   ├── wine-pairings/ # Food pairing guides
│   └── buy/         # Price-point recommendations
├── scripts/         # Automation scripts
├── lib/             # Core functionality
├── layouts/         # Page templates
└── assets/images/   # AI-generated article images
```

## Environment Variables

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
WINE_CATALOG_URL=
WINE_CATALOG_ANON_KEY=
ANTHROPIC_API_KEY=
REPLICATE_API_TOKEN=
```

## Daily Workflow

```bash
# 1. Generate articles (auto-skips duplicates)
npx tsx src/scripts/generate-priority-articles.ts

# 2. Enrich new articles
npx tsx src/scripts/enrich-articles.ts --thin-only

# 3. Build & deploy
npm run build && git push
```

## Tech Stack

- **Astro** - Static + SSR framework
- **Tailwind CSS** - Styling
- **Supabase** - Database (keywords, tracking)
- **Anthropic Claude** - Content enrichment
- **Replicate** - AI image generation
- **Vercel** - Hosting & deployment
