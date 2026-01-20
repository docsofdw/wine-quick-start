#!/usr/bin/env npx tsx
/**
 * SEO Enhancement Script
 * - Adds BreadcrumbList schema
 * - Enhances Article schema with publisher info
 * - Audits and reports meta descriptions
 */

import * as fs from 'fs';
import * as path from 'path';

const PAGES_DIR = path.join(process.cwd(), 'src/pages');
const SITE_URL = 'https://winequickstart.com';

interface SEOAudit {
  file: string;
  slug: string;
  title: string;
  description: string;
  descriptionLength: number;
  hasSchema: boolean;
  hasBreadcrumbSchema: boolean;
  issues: string[];
}

// Get category info from path
function getCategoryFromPath(filePath: string): { name: string; slug: string } {
  if (filePath.includes('/wine-pairings/')) {
    return { name: 'Wine Pairings', slug: 'wine-pairings' };
  }
  if (filePath.includes('/learn/')) {
    return { name: 'Learn', slug: 'learn' };
  }
  if (filePath.includes('/buy/')) {
    return { name: 'Buy', slug: 'buy' };
  }
  return { name: 'Wine Guide', slug: 'wine-pairings' };
}

// Build enhanced schema with breadcrumbs and publisher
function buildEnhancedSchema(
  article: {
    title: string;
    description: string;
    author: string;
    authorRole: string;
    pubDate: string;
  },
  category: { name: string; slug: string },
  slug: string
): object {
  const articleUrl = `${SITE_URL}/${category.slug}/${slug}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      // Organization
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        "name": "Wine Quick Start",
        "url": SITE_URL,
        "description": "Expert wine guidance from certified sommeliers"
      },
      // WebSite
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        "url": SITE_URL,
        "name": "Wine Quick Start",
        "publisher": { "@id": `${SITE_URL}/#organization` }
      },
      // BreadcrumbList
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": SITE_URL
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": category.name,
            "item": `${SITE_URL}/${category.slug}/`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": article.title
          }
        ]
      },
      // Article
      {
        "@type": "Article",
        "headline": article.title,
        "description": article.description,
        "author": {
          "@type": "Person",
          "name": article.author,
          "jobTitle": article.authorRole
        },
        "publisher": { "@id": `${SITE_URL}/#organization` },
        "datePublished": article.pubDate,
        "dateModified": article.pubDate,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": articleUrl
        },
        "isPartOf": { "@id": `${SITE_URL}/#website` }
      }
    ]
  };
}

// Parse frontmatter from file content
function extractFrontmatter(content: string): Record<string, any> | null {
  const match = content.match(/const\s+frontmatter\s*=\s*(\{[\s\S]*?\});/);
  if (!match) return null;

  try {
    // Extract structured_data block separately to avoid eval issues
    const frontmatterStr = match[1];

    // Parse key values manually
    const titleMatch = frontmatterStr.match(/title:\s*["']([^"']+)["']/);
    const descMatch = frontmatterStr.match(/description:\s*["']([^"']+)["']/);
    const authorMatch = frontmatterStr.match(/author:\s*["']([^"']+)["']/);
    const authorRoleMatch = frontmatterStr.match(/authorRole:\s*["']([^"']+)["']/);
    const pubDateMatch = frontmatterStr.match(/pubDate:\s*["']([^"']+)["']/);

    return {
      title: titleMatch?.[1] || '',
      description: descMatch?.[1] || '',
      author: authorMatch?.[1] || 'Wine Quick Start Team',
      authorRole: authorRoleMatch?.[1] || 'Expert Contributor',
      pubDate: pubDateMatch?.[1] || new Date().toISOString().split('T')[0]
    };
  } catch (e) {
    return null;
  }
}

// Update the structured_data in a file
function updateStructuredData(filePath: string, newSchema: object): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Check if file has structured_data
  const hasStructuredData = content.includes('structured_data:');
  if (!hasStructuredData) {
    console.log(`  ⚠ No structured_data found, skipping`);
    return false;
  }

  // Replace the structured_data block
  const schemaJson = JSON.stringify(newSchema, null, 6).replace(/^/gm, '      ').trim();

  // Find and replace the structured_data block
  const structuredDataRegex = /structured_data:\s*\{[\s\S]*?\n\s{2}\}/;
  const newStructuredData = `structured_data: ${schemaJson}`;

  if (!structuredDataRegex.test(content)) {
    console.log(`  ⚠ Could not match structured_data pattern`);
    return false;
  }

  const newContent = content.replace(structuredDataRegex, newStructuredData);
  fs.writeFileSync(filePath, newContent);
  return true;
}

// Scan and audit all articles
function scanArticles(): SEOAudit[] {
  const audits: SEOAudit[] = [];
  const directories = ['learn', 'wine-pairings', 'buy'];

  for (const dir of directories) {
    const dirPath = path.join(PAGES_DIR, dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.astro') && f !== 'index.astro');

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const slug = file.replace('.astro', '');

      const frontmatter = extractFrontmatter(content);
      if (!frontmatter) continue;

      const issues: string[] = [];

      // Check description length (optimal: 150-160 chars)
      const descLen = frontmatter.description?.length || 0;
      if (descLen < 120) {
        issues.push(`Description too short (${descLen} chars, aim for 150-160)`);
      } else if (descLen > 160) {
        issues.push(`Description too long (${descLen} chars, aim for 150-160)`);
      }

      // Check for schema
      const hasSchema = content.includes('structured_data:');
      const hasBreadcrumbSchema = content.includes('BreadcrumbList');

      if (!hasSchema) {
        issues.push('Missing structured_data schema');
      }

      if (!hasBreadcrumbSchema && hasSchema) {
        issues.push('Missing BreadcrumbList schema');
      }

      // Check title length
      const titleLen = frontmatter.title?.length || 0;
      if (titleLen > 60) {
        issues.push(`Title too long for SEO (${titleLen} chars, aim for <60)`);
      }

      audits.push({
        file: `${dir}/${file}`,
        slug,
        title: frontmatter.title || '',
        description: frontmatter.description || '',
        descriptionLength: descLen,
        hasSchema,
        hasBreadcrumbSchema,
        issues
      });
    }
  }

  return audits;
}

// Enhance schema for all articles
function enhanceAllArticles(): number {
  let updated = 0;
  const directories = ['learn', 'wine-pairings', 'buy'];

  for (const dir of directories) {
    const dirPath = path.join(PAGES_DIR, dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.astro') && f !== 'index.astro');

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const slug = file.replace('.astro', '');

      // Skip if already has BreadcrumbList
      if (content.includes('BreadcrumbList')) {
        continue;
      }

      const frontmatter = extractFrontmatter(content);
      if (!frontmatter) continue;

      const category = getCategoryFromPath(filePath);
      const newSchema = buildEnhancedSchema(
        {
          title: frontmatter.title,
          description: frontmatter.description,
          author: frontmatter.author,
          authorRole: frontmatter.authorRole,
          pubDate: frontmatter.pubDate
        },
        category,
        slug
      );

      console.log(`Enhancing: ${dir}/${file}`);
      if (updateStructuredData(filePath, newSchema)) {
        updated++;
      }
    }
  }

  return updated;
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--audit')) {
    console.log('\n📊 SEO Audit Report\n');
    console.log('='.repeat(80));

    const audits = scanArticles();

    // Group by issues
    const withIssues = audits.filter(a => a.issues.length > 0);
    const withoutIssues = audits.filter(a => a.issues.length === 0);

    console.log(`\n✅ Articles with good SEO: ${withoutIssues.length}`);
    console.log(`⚠️  Articles with issues: ${withIssues.length}\n`);

    if (withIssues.length > 0) {
      console.log('Issues found:\n');
      for (const audit of withIssues) {
        console.log(`📄 ${audit.file}`);
        console.log(`   Title: "${audit.title}"`);
        for (const issue of audit.issues) {
          console.log(`   ❌ ${issue}`);
        }
        console.log('');
      }
    }

    // Summary stats
    const avgDescLen = Math.round(audits.reduce((sum, a) => sum + a.descriptionLength, 0) / audits.length);
    const withBreadcrumbs = audits.filter(a => a.hasBreadcrumbSchema).length;

    console.log('\n📈 Summary Statistics:');
    console.log(`   Total articles: ${audits.length}`);
    console.log(`   Average description length: ${avgDescLen} chars`);
    console.log(`   Articles with BreadcrumbList schema: ${withBreadcrumbs}/${audits.length}`);

  } else if (args.includes('--enhance')) {
    console.log('\n🔧 Enhancing article schema...\n');
    const updated = enhanceAllArticles();
    console.log(`\n✅ Enhanced ${updated} articles with improved schema markup`);

  } else {
    console.log(`
SEO Enhancement Script

Usage:
  npx tsx src/scripts/enhance-seo.ts --audit    Audit all articles for SEO issues
  npx tsx src/scripts/enhance-seo.ts --enhance  Add BreadcrumbList schema to articles
`);
  }
}

main().catch(console.error);
