# Dynamic Index Pages

## Overview

The index pages (`/learn/` and `/buy/`) now automatically discover and display new articles without requiring manual updates. This eliminates 404 errors and ensures new content is immediately visible on the site.

## How It Works

### File-Based Content Discovery

Both index pages use Astro's `Astro.glob()` function to:

1. **Scan Directory**: Automatically find all `.astro` files in their respective directories
2. **Extract Metadata**: Read frontmatter data (title, description, readTime) from each file
3. **Auto-Categorize**: Intelligently categorize articles based on title keywords
4. **Sort Content**: Display articles in a logical order by category and title

### Learn Page (`/learn/index.astro`)

- **Auto-discovers**: All articles in `src/pages/learn/`
- **Categories**: Wine Types, Wine Regions, Reviews, Wine Guide
- **Sorting**: Regions → Types → Reviews → General

### Buy Page (`/buy/index.astro`)

- **Auto-discovers**: All articles in `src/pages/buy/`
- **Categories**: Natural, Orange, Pricing, Buying Guide
- **Price Ranges**: Automatically assigned based on content
- **Sorting**: Natural → Orange → Pricing → General

## Benefits

✅ **No More 404s**: Only displays articles that actually exist
✅ **Zero Maintenance**: New articles appear automatically
✅ **Consistent Experience**: All content is discoverable
✅ **Smart Categorization**: Articles are properly organized

## Technical Details

### Type Safety

Both pages use TypeScript interfaces for type safety:

```typescript
interface GuideData {
  title: string;
  slug: string;
  description: string;
  readTime: string;
  category: string;
  priceRange?: string; // Only for buy pages
}
```

### Categorization Logic

Articles are categorized based on title content:

- **Natural Wine** → "Wine Types" or "Natural"
- **Orange Wine** → "Wine Types" or "Orange"
- **Bordeaux** → "Wine Regions"
- **Recommendations** → "Reviews"
- **Price/Under $X** → "Reviews" or "Pricing"

### Validation

Test the dynamic discovery with:

```bash
npm run wine:validate-links
```

This builds the site and confirms all index pages work correctly.

## Future Enhancements

- **Search Functionality**: Filter articles by category or keyword
- **Pagination**: Handle large numbers of articles
- **Featured Articles**: Promote specific high-quality content
- **Recent Articles**: Show newest content first

## Troubleshooting

If articles don't appear:

1. Check file exists in correct directory
2. Verify frontmatter is properly formatted
3. Run `npm run build` to test locally
4. Check browser console for errors

The dynamic system ensures your wine content site scales automatically as you add new articles! 