/**
 * Import existing Astro wine pages into Supabase database
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// Load env vars
config({ path: '.env.local', override: true });

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_ANON_KEY not found in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface ParsedPage {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  searchVolume?: number;
  keywordDifficulty?: number;
  content: string;
}

async function importExistingPages() {
  console.log('📥 Importing existing wine pages to Supabase...\n');

  try {
    const pagesDir = path.join(process.cwd(), 'src/pages/wine-pairings');
    const files = await fs.readdir(pagesDir);
    
    // Filter for .astro files, exclude index.astro
    const astroFiles = files.filter(file => 
      file.endsWith('.astro') && 
      file !== 'index.astro'
    );

    console.log(`Found ${astroFiles.length} wine pages to import:`);
    astroFiles.forEach(file => console.log(`  - ${file}`));

    const importedPages: ParsedPage[] = [];

    // Parse each file
    for (const file of astroFiles) {
      console.log(`\n📄 Parsing ${file}...`);
      
      try {
        const filePath = path.join(pagesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = parseAstroFile(file, content);
        
        if (parsed) {
          importedPages.push(parsed);
          console.log(`✅ Parsed: ${parsed.title}`);
        } else {
          console.log(`⚠️  Could not parse ${file}`);
        }
      } catch (error) {
        console.log(`❌ Error parsing ${file}:`, error);
      }
    }

    console.log(`\n💾 Importing ${importedPages.length} pages to Supabase...`);

    // Import to Supabase
    let successCount = 0;
    for (const page of importedPages) {
      try {
        // Try to insert without search volume columns first
        const basicData = {
          slug: page.slug,
          title: page.title,
          description: page.description,
          content: page.content,
          keywords: page.keywords,
          status: 'published'
        };

        const { data, error } = await supabase
          .from('wine_pages')
          .upsert(basicData)
          .select();

        if (error) {
          console.log(`❌ Failed to import ${page.slug}:`, error.message);
        } else {
          console.log(`✅ Imported: ${page.slug}`);
          successCount++;
        }
      } catch (error) {
        console.log(`❌ Error importing ${page.slug}:`, error);
      }
    }

    console.log(`\n🎉 Import complete!`);
    console.log(`✅ Successfully imported: ${successCount}/${importedPages.length} pages`);
    
    // Verify import
    console.log('\n📊 Verifying import...');
    const { data: verifyData, error: verifyError, count } = await supabase
      .from('wine_pages')
      .select('slug, title, status', { count: 'exact' });

    if (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
    } else {
      console.log(`✅ Database now contains ${count} wine pages:`);
      verifyData?.forEach(page => {
        console.log(`  - ${page.slug}: ${page.title} (${page.status})`);
      });
    }

  } catch (error) {
    console.error('❌ Import failed:', error);
  }
}

function parseAstroFile(filename: string, content: string): ParsedPage | null {
  try {
    const slug = filename.replace('.astro', '');
    
    // Extract frontmatter
    const frontmatterMatch = content.match(/const frontmatter = \{([\s\S]*?)\};/);
    if (!frontmatterMatch) {
      return null;
    }

    // Simple parsing - extract title and description
    const titleMatch = content.match(/title:\s*"([^"]+)"/);
    const descriptionMatch = content.match(/description:\s*"([^"]+)"/);
    const keywordsMatch = content.match(/keywords:\s*\[(.*?)\]/);
    const searchVolumeMatch = content.match(/searchVolume:\s*(\d+)/);
    const keywordDifficultyMatch = content.match(/keywordDifficulty:\s*(\d+)/);

    const title = titleMatch ? titleMatch[1] : `${slug.replace(/-/g, ' ')} - Wine Guide`;
    const description = descriptionMatch ? descriptionMatch[1] : `Expert guide for ${slug.replace(/-/g, ' ')}`;
    
    // Parse keywords array
    let keywords = ['wine', 'guide'];
    if (keywordsMatch) {
      const keywordString = keywordsMatch[1];
      const parsedKeywords = keywordString
        .split(',')
        .map(k => k.trim().replace(/['"]/g, ''))
        .filter(k => k.length > 0);
      keywords = parsedKeywords.length > 0 ? parsedKeywords : keywords;
    }

    // Extract main content (simplified)
    const contentStart = content.indexOf('<article');
    const contentEnd = content.lastIndexOf('</article>');
    let mainContent = 'Expert wine guide with recommendations and pairings.';
    
    if (contentStart !== -1 && contentEnd !== -1) {
      const articleContent = content.substring(contentStart, contentEnd + 10);
      // Extract text content from HTML (simplified)
      mainContent = articleContent
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 1000) + '...';
    }

    return {
      slug,
      title,
      description,
      keywords,
      searchVolume: searchVolumeMatch ? parseInt(searchVolumeMatch[1]) : undefined,
      keywordDifficulty: keywordDifficultyMatch ? parseInt(keywordDifficultyMatch[1]) : undefined,
      content: mainContent
    };
  } catch (error) {
    console.error(`Error parsing ${filename}:`, error);
    return null;
  }
}

importExistingPages();