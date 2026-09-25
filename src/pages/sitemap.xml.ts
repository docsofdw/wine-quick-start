import type { APIRoute } from 'astro';

const SITE_URL = 'https://winesquickstart.com';

const learnPages = import.meta.glob('./learn/*.astro');
const pairingsPages = import.meta.glob('./wine-pairings/*.astro');
const buyPages = import.meta.glob('./buy/*.astro');

function extractSlugFromPath(filePath: string): string {
  const match = filePath.match(/\/(learn|wine-pairings|buy)\/(.+)\.astro$/);
  if (!match) return '';
  const [, category, slug] = match;
  return slug === 'index' ? '' : slug;
}

function buildPageList(): string[] {
  const pages: string[] = [];
  
  // Static pages
  pages.push('/');
  pages.push('/about');
  pages.push('/contact');
  pages.push('/privacy');
  pages.push('/terms');
  pages.push('/gifts');
  pages.push('/shop');
  pages.push('/subscription');
  
  // Category index pages
  pages.push('/learn/');
  pages.push('/wine-pairings/');
  pages.push('/buy/');
  
  // Learn articles
  for (const path of Object.keys(learnPages)) {
    const slug = extractSlugFromPath(path);
    if (slug) {
      pages.push(`/learn/${slug}`);
    }
  }
  
  // Wine pairings articles
  for (const path of Object.keys(pairingsPages)) {
    const slug = extractSlugFromPath(path);
    if (slug) {
      pages.push(`/wine-pairings/${slug}`);
    }
  }
  
  // Buy guides
  for (const path of Object.keys(buyPages)) {
    const slug = extractSlugFromPath(path);
    if (slug) {
      pages.push(`/buy/${slug}`);
    }
  }
  
  return pages;
}

export const GET: APIRoute = async () => {
  const pages = buildPageList();
  const lastmod = new Date().toISOString();
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${SITE_URL}${page}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
