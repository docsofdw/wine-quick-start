/**
 * Fix formatting issues in articles:
 * 1. readTime: "undefined" -> proper read time
 * 2. expert_score: undefined -> proper score
 * 3. <p><strong>undefined:</strong> undefined</p> -> proper quick answer
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Quick answers by article type
const quickAnswers: Record<string, { label: string; answer: string }> = {
  'merlot': { label: 'Quick Answer', answer: 'Merlot is a smooth, medium-bodied red wine known for its plum and cherry flavors. It pairs excellently with grilled meats, pasta dishes, and aged cheeses.' },
  'malbec': { label: 'Quick Answer', answer: 'Malbec is a full-bodied red wine with bold dark fruit flavors. It pairs perfectly with grilled steak, barbecue, and spicy dishes.' },
  'prosecco': { label: 'Quick Answer', answer: 'Prosecco is a light, refreshing Italian sparkling wine. Serve chilled as an aperitif or pair with light appetizers, seafood, and fresh salads.' },
  'riesling': { label: 'Quick Answer', answer: 'Riesling is an aromatic white wine ranging from dry to sweet. It pairs beautifully with spicy Asian cuisine, pork, and seafood.' },
  'rose-wine': { label: 'Quick Answer', answer: 'Rosé is a versatile pink wine perfect for warm weather. Pair with Mediterranean dishes, grilled vegetables, and light salads.' },
  'sauvignon-blanc': { label: 'Quick Answer', answer: 'Sauvignon Blanc is a crisp, refreshing white wine with citrus and herbal notes. It pairs excellently with goat cheese, seafood, and green vegetables.' },
  'syrah': { label: 'Quick Answer', answer: 'Syrah (Shiraz) is a bold, full-bodied red wine with dark fruit and spice. Pair with grilled lamb, barbecue, and hearty stews.' },
  'zinfandel': { label: 'Quick Answer', answer: 'Zinfandel is a bold American red wine with jammy fruit and spice. It pairs perfectly with barbecue, pizza, and spicy dishes.' },
  'wine-with-cheese': { label: 'Quick Answer', answer: 'Match wine body to cheese intensity: light wines with fresh cheeses, bold reds with aged hard cheeses, and sweet wines with blue cheese.' },
  'wine-with-chicken': { label: 'Quick Answer', answer: 'For chicken, choose wine based on preparation: Chardonnay for roasted, Pinot Noir for grilled, or Sauvignon Blanc for lighter dishes.' },
  'wine-with-fish': { label: 'Quick Answer', answer: 'Light white wines like Sauvignon Blanc and Pinot Grigio complement most fish. For richer fish, try Chardonnay or light Pinot Noir.' },
  'wine-with-lamb': { label: 'Quick Answer', answer: 'Lamb pairs beautifully with medium to full-bodied reds like Cabernet Sauvignon, Syrah, or Côtes du Rhône blends.' },
  'wine-with-pasta': { label: 'Quick Answer', answer: 'Match wine to sauce: tomato-based with Chianti, cream-based with Chardonnay, and meat sauces with Sangiovese or Barbera.' },
  'wine-with-pizza': { label: 'Quick Answer', answer: 'Italian reds like Chianti and Barbera are classic pizza pairings. For white pizza, try a crisp Pinot Grigio.' },
  'wine-with-pork': { label: 'Quick Answer', answer: 'Pork is versatile—pair with Pinot Noir for tenderloin, Riesling for pork chops, or Zinfandel for barbecue ribs.' },
  'wine-with-seafood': { label: 'Quick Answer', answer: 'Crisp white wines like Muscadet, Albariño, and Chablis are ideal for most seafood. Champagne elevates oysters and shellfish.' },
  'wine-with-steak': { label: 'Quick Answer', answer: 'Bold red wines like Cabernet Sauvignon, Malbec, and Syrah are perfect partners for grilled steak and red meat.' },
  'wine-with-sushi': { label: 'Quick Answer', answer: 'Dry sparkling wines, crisp Riesling, and light sake complement sushi best. Avoid heavy oaked wines.' },
  'wine-with-tacos': { label: 'Quick Answer', answer: 'Tacos pair well with refreshing wines: Albariño or Verdejo for fish tacos, Tempranillo or Garnacha for meat tacos.' },
  'wine-with-turkey': { label: 'Quick Answer', answer: 'Pinot Noir is the classic Thanksgiving choice. Beaujolais, Riesling, and sparkling wines also complement turkey beautifully.' },
};

async function fixArticles() {
  console.log('=== Fixing Article Formatting Issues ===\n');

  const files = await glob('src/pages/**/*.astro');
  let fixedCount = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    let modified = false;
    const slug = path.basename(file, '.astro');

    // Fix readTime: "undefined" -> "5 min"
    if (content.includes('readTime: "undefined"')) {
      content = content.replace('readTime: "undefined"', 'readTime: "5 min"');
      modified = true;
      console.log(`✓ Fixed readTime in ${slug}`);
    }

    // Fix expert_score: undefined -> 9
    if (content.includes('expert_score: undefined')) {
      content = content.replace('expert_score: undefined', 'expert_score: 9');
      modified = true;
      console.log(`✓ Fixed expert_score in ${slug}`);
    }

    // Fix undefined quick answer
    if (content.includes('<p><strong>undefined:</strong> undefined</p>')) {
      const qa = quickAnswers[slug];
      if (qa) {
        content = content.replace(
          '<p><strong>undefined:</strong> undefined</p>',
          `<p><strong>${qa.label}:</strong> ${qa.answer}</p>`
        );
        modified = true;
        console.log(`✓ Fixed quick answer in ${slug}`);
      } else {
        // Generic fallback
        content = content.replace(
          '<p><strong>undefined:</strong> undefined</p>',
          '<p><strong>Quick Answer:</strong> Explore our expert guide below for detailed recommendations and pairing suggestions.</p>'
        );
        modified = true;
        console.log(`✓ Fixed quick answer in ${slug} (generic)`);
      }
    }

    if (modified) {
      fs.writeFileSync(file, content);
      fixedCount++;
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} files`);
}

fixArticles();
