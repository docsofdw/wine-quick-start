import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://winesquickstart.com';

function getAllPages(): string[] {
  const pages: string[] = [];
  const pagesDir = path.join(process.cwd(), 'src/pages');
  
  const categories = ['learn', 'wine-pairings', 'buy'];
  
  for (const category of categories) {
    const categoryDir = path.join(pagesDir, category);
    if (fs.existsSync(categoryDir)) {
      const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.astro') && f !== 'index.astro');
      for (const file of files) {
        const slug = file.replace('.astro', '');
        pages.push(`/${category}/${slug}`);
      }
      pages.push(`/${category}/`);
    }
  }
  
  pages.push('/');
  pages.push('/about');
  pages.push('/contact');
  pages.push('/privacy');
  pages.push('/terms');
  pages.push('/gifts');
  pages.push('/shop');
  
  return pages;
}

export const GET: APIRoute = async () => {
  const pages = getAllPages();
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
