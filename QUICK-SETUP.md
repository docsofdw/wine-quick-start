# 🚀 Quick Setup Guide - No DataForSEO Required!

## Step 1: Execute Supabase Schema (5 minutes)

Since CLI requires service role permissions, use the Supabase Dashboard:

1. **Go to SQL Editor:**
   ```
   https://supabase.com/dashboard/project/nsyubkcfsrsowgefkbii/sql/new
   ```

2. **Copy the entire `supabase-schema.sql` file**

3. **Paste into the SQL editor and click "Run"**

4. **Verify tables were created:**
   - Go to Table Editor
   - You should see: `wine_pages`, `keyword_opportunities`, `newsletter_subscribers`

---

## Step 2: Seed Keywords (1 minute)

No DataForSEO needed! We have 70+ manually curated keywords.

```bash
npm run seed:keywords
```

This will populate your `keyword_opportunities` table with:
- 70+ wine pairing keywords
- Varietal guides
- Regional content
- Price-point articles
- Food pairing combinations

---

## Step 3: Generate Your First Pages (30 seconds)

```bash
npm run wine:daily
```

This will:
- ✅ Pick 5 random keywords from your seeded list
- ✅ Generate high-quality wine content
- ✅ Create Astro pages automatically
- ✅ Save to database

---

## Step 4: Preview & Deploy

```bash
# Build and preview locally
npm run build
npm run preview

# When ready, commit and push
git add .
git commit -m "Production ready - no DataForSEO dependency"
git push origin main
```

---

## How It Works Without DataForSEO

### Manual Keyword Curation (Smart Approach)
Instead of paying $100/month for keyword research, we've curated 70+ high-value wine keywords based on:
- Common food pairings (wine with chicken, pizza, pasta, etc.)
- Popular varietals (Merlot, Sauvignon Blanc, etc.)
- Regional guides (Napa, Tuscany, Rioja, etc.)
- Price points (under $15, under $25, etc.)
- Seasonal/occasion content

### Benefits
✅ **$0/month cost** - No API fees  
✅ **Curated quality** - Hand-picked valuable keywords  
✅ **Evergreen content** - Topics stay relevant  
✅ **Easy to expand** - Just add keywords to `src/lib/wine-keywords.ts`

### Expanding Your Keyword List

Edit `src/lib/wine-keywords.ts` and add more keywords:

```typescript
export const wineKeywords = [
  // Add your keywords here
  'wine with steak',
  'wine with fish tacos',
  'prosecco cocktails',
  // etc.
];
```

Then run `npm run seed:keywords` again to update the database.

---

## Daily Workflow

### Automated (Set it and forget it)
The Vercel cron job runs daily at 9 AM UTC:
- Picks 5 unused keywords
- Generates content
- Creates pages
- Updates database

### Manual (When you want control)
```bash
# Generate 5 pages right now
npm run wine:daily

# Check what's been generated
npm run wine:status

# Build and preview
npm run build && npm run preview
```

---

## Monitoring

### Check Your Content
```bash
# See generated pages
ls src/pages/learn/
ls src/pages/wine-pairings/
ls src/pages/buy/

# Check database status
npm run wine:status
```

### Supabase Dashboard
Monitor your tables:
- `wine_pages` - Generated content
- `keyword_opportunities` - Available keywords (status: active/used)
- `newsletter_subscribers` - Email signups

---

## Scaling to 1,000+ Pages

### Strategy
1. **Month 1:** Use the 70 curated keywords (14 days of content)
2. **Month 2:** Research and add 50 more keywords manually
3. **Month 3:** Add seasonal content (holiday wines, summer wines)
4. **Month 4+:** Analyze top performers, create similar content

### Adding Keywords

Research these manually (free tools):
- Google autocomplete ("wine with...")
- Reddit wine communities
- Wine blog comment sections
- Your own website analytics (what people search for)

Add to `src/lib/wine-keywords.ts` → Run `npm run seed:keywords`

---

## Cost Comparison

### With DataForSEO
- $100/month minimum
- Overkill for starting out
- Complex API integration

### Without (Our Approach)
- $0/month
- 70+ curated keywords to start
- Easy to expand manually
- Just as effective for SEO

---

## Next Steps

1. ✅ Execute schema in Supabase Dashboard
2. ✅ Run `npm run seed:keywords`
3. ✅ Run `npm run wine:daily` to test
4. ✅ Build & preview
5. ✅ Commit & push to deploy

**You're ready to ship! 🚀**

