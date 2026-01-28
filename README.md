# Wine Quick Start

SEO-optimized wine education site that funnels traffic to **[Cellars of DW](https://cellarsofdw.com)** wine consulting services.

**Live Site:** [winequickstart.com](https://winequickstart.com)

## Purpose

Wine Quick Start serves as a content marketing funnel for Cellars of DW, a boutique wine consultancy. The site provides free wine education and guidance, building trust and authority, then directs visitors to consulting services:

- **Wine Selection Help** (`/shop`) → Get personalized recommendations
- **Gift Consulting** (`/gifts`) → Expert help choosing wine gifts
- **Wine Advisory** (`/subscription`) → Ongoing sommelier retainer service

All service pages funnel to the contact form, which routes inquiries to **dw@cellarsofdw.com**.

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
- **Lead Generation Funnels** - Service pages designed to capture consulting leads
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
│   ├── buy/         # Price-point recommendations
│   ├── shop.astro   # Wine selection consulting funnel
│   ├── gifts.astro  # Gift consulting funnel
│   └── subscription.astro # Advisory service funnel
├── scripts/         # Automation scripts
├── lib/             # Core functionality
├── layouts/         # Page templates
└── assets/images/   # AI-generated article images
```

## Service Funnels

| Page | Purpose | CTA |
|------|---------|-----|
| `/shop` | Wine selection help | Contact for recommendations |
| `/gifts` | Gift consulting | Contact for gift advice |
| `/subscription` | Ongoing advisory | Contact for retainer info |

All CTAs route to `/contact/` which sends inquiries to Cellars of DW.

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

---

**A project by [Cellars of DW](https://cellarsofdw.com)** — Wine consulting for collectors, businesses, and enthusiasts.

Contact: **dw@cellarsofdw.com**
