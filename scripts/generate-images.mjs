import Replicate from "replicate";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Image configurations - adapted from your Midjourney prompts
const images = [
  // === PRIORITY 1: High-traffic food pairings ===
  {
    name: "wine-with-steak",
    folder: "articles",
    prompt: "overhead flat lay photo, perfectly grilled ribeye steak with grill marks, glass of red wine cabernet sauvignon, fresh rosemary and garlic, burgundy linen napkin, dark wooden table, soft natural lighting, professional food photography, warm color tones, minimal styling --ar 16:9"
  },
  {
    name: "wine-with-chicken",
    folder: "articles",
    prompt: "elegant table setting, roasted chicken with crispy golden skin, glass of white wine chardonnay, fresh herbs thyme and sage, warm restaurant lighting, professional food photography, shallow depth of field, burgundy accents --ar 16:9"
  },
  {
    name: "wine-with-pasta",
    folder: "articles",
    prompt: "overhead flat lay, creamy pasta dish with parmesan shavings, glass of Italian white wine, fresh basil leaves, rustic wooden table, soft natural lighting, professional food photography, warm inviting tones --ar 16:9"
  },
  {
    name: "wine-with-pizza",
    folder: "articles",
    prompt: "artisan pizza margherita with fresh mozzarella and basil, glass of Italian red wine chianti, casual restaurant setting, warm ambient lighting, professional food photography, rustic wooden board --ar 16:9"
  },
  {
    name: "cheap-natural-wine",
    folder: "articles",
    prompt: "affordable natural wine bottles arranged artistically, casual wine bar setting, natural light, accessible and friendly atmosphere, warm welcoming tones with burgundy accents, lifestyle photography --ar 16:9"
  },

  // === PRIORITY 2: Wine variety pages ===
  {
    name: "cabernet-sauvignon",
    folder: "articles",
    prompt: "elegant glass of deep red cabernet sauvignon wine, professional wine photography, dark moody background, soft lighting highlighting wine color, grape vine leaves accent, sophisticated composition --ar 16:9"
  },
  {
    name: "chardonnay",
    folder: "articles",
    prompt: "glass of golden chardonnay white wine, soft natural lighting, elegant wine glass, subtle oak barrel in background, professional wine photography, warm golden tones --ar 16:9"
  },
  {
    name: "merlot",
    folder: "articles",
    prompt: "glass of smooth merlot red wine, velvet burgundy color, professional wine photography, soft ambient lighting, wine bottle in background, elegant dark setting --ar 16:9"
  },
  {
    name: "pinot-noir",
    folder: "articles",
    prompt: "delicate glass of pinot noir, light ruby red color, professional wine photography, soft natural lighting, burgundy vineyard atmosphere, elegant and refined --ar 16:9"
  },
  {
    name: "sauvignon-blanc",
    folder: "articles",
    prompt: "crisp glass of sauvignon blanc, pale straw color, condensation on glass, fresh citrus accents, bright natural lighting, professional wine photography, clean minimal composition --ar 16:9"
  },
  {
    name: "riesling",
    folder: "articles",
    prompt: "elegant glass of riesling wine, pale golden color, German wine glass style, soft natural lighting, subtle floral elements, professional wine photography --ar 16:9"
  },
  {
    name: "malbec",
    folder: "articles",
    prompt: "bold glass of malbec wine, deep purple-red color, Argentine wine aesthetic, professional photography, dark moody lighting, rich and intense atmosphere --ar 16:9"
  },
  {
    name: "syrah",
    folder: "articles",
    prompt: "glass of dark syrah wine, deep purple color, professional wine photography, moody dramatic lighting, peppercorn and dark fruit accents, sophisticated composition --ar 16:9"
  },
  {
    name: "prosecco",
    folder: "articles",
    prompt: "elegant flute of sparkling prosecco, golden bubbles rising, celebration atmosphere, soft natural lighting, Italian aperitivo setting, professional beverage photography --ar 16:9"
  },
  {
    name: "rose-wine",
    folder: "articles",
    prompt: "beautiful glass of rosé wine, pale salmon pink color, summer terrace setting, soft golden hour lighting, fresh and elegant, professional wine photography --ar 16:9"
  },
  {
    name: "zinfandel",
    folder: "articles",
    prompt: "bold glass of zinfandel red wine, rich ruby color, California wine country aesthetic, warm lighting, rustic elegant setting, professional wine photography --ar 16:9"
  },
  {
    name: "natural-wine",
    folder: "articles",
    prompt: "natural wine in rustic glass, slightly cloudy appearance, organic vineyard aesthetic, earth tones with burgundy accents, minimal intervention wine, artisanal feeling --ar 16:9"
  },

  // === PRIORITY 3: More food pairings ===
  {
    name: "wine-with-fish",
    folder: "articles",
    prompt: "elegant white fish fillet with crispy skin, glass of white wine, lemon and capers, fine dining presentation, soft natural lighting, professional food photography --ar 16:9"
  },
  {
    name: "wine-with-seafood",
    folder: "articles",
    prompt: "seafood platter with oysters shrimp and mussels, glass of champagne or white wine, ice and lemon, elegant restaurant setting, professional food photography --ar 16:9"
  },
  {
    name: "wine-with-sushi",
    folder: "articles",
    prompt: "elegant sushi platter with fresh nigiri and rolls, glass of sake or white wine, minimalist Japanese aesthetic, clean presentation, professional food photography --ar 16:9"
  },
  {
    name: "wine-with-lamb",
    folder: "articles",
    prompt: "herb-crusted rack of lamb, glass of bold red wine, rosemary and garlic, elegant plating, warm restaurant lighting, professional food photography --ar 16:9"
  },
  {
    name: "wine-with-pork",
    folder: "articles",
    prompt: "perfectly roasted pork tenderloin with apple compote, glass of white or light red wine, sage leaves, rustic elegant setting, professional food photography --ar 16:9"
  },
  {
    name: "wine-with-turkey",
    folder: "articles",
    prompt: "roasted turkey with golden skin, glass of pinot noir or chardonnay, thanksgiving harvest setting, warm ambient lighting, professional food photography --ar 16:9"
  },
  {
    name: "wine-with-cheese",
    folder: "articles",
    prompt: "artisan cheese board with variety of cheeses, glass of red wine, grapes and crackers, rustic wooden board, warm lighting, professional food photography --ar 16:9"
  },
  {
    name: "wine-with-tacos",
    folder: "articles",
    prompt: "gourmet tacos with fresh toppings, glass of crisp white wine or rosé, lime wedges, casual elegant setting, vibrant colors, professional food photography --ar 16:9"
  },
  {
    name: "wine-pairing",
    folder: "articles",
    prompt: "elegant wine and food pairing spread, multiple wine glasses with different wines, variety of dishes, professional food photography, warm inviting atmosphere --ar 16:9"
  },

  // === Learn section articles ===
  {
    name: "best-natural-wine-for-beginners",
    folder: "articles",
    prompt: "approachable natural wine bottles with friendly labels, bright welcoming setting, beginner-friendly wine selection, warm natural lighting, lifestyle photography --ar 16:9"
  },
  {
    name: "cheap-orange-wine",
    folder: "articles",
    prompt: "amber orange wine in glass, affordable wine bottles, warm copper tones, natural lighting, accessible wine bar setting, friendly atmosphere --ar 16:9"
  },
  {
    name: "natural-wine-review",
    folder: "articles",
    prompt: "natural wine tasting setup, multiple bottles and glasses, tasting notes paper, professional wine review setting, warm lighting --ar 16:9"
  },
  {
    name: "natural-wine-under-20",
    folder: "articles",
    prompt: "budget-friendly natural wine bottles, price tags showing under 20 dollars, casual wine shop setting, accessible and welcoming, warm lighting --ar 16:9"
  },
  {
    name: "natural-wine-under-50",
    folder: "articles",
    prompt: "mid-range natural wine selection, quality bottles with minimal labels, wine shop display, warm ambient lighting, curated selection --ar 16:9"
  },
  {
    name: "orange-wine-under-50",
    folder: "articles",
    prompt: "selection of orange wines in amber hues, skin contact wines, modern wine bar setting, warm copper and orange tones, professional photography --ar 16:9"
  },
  {
    name: "under-20-orange-wine",
    folder: "articles",
    prompt: "affordable orange wine bottles, budget-friendly selection, casual setting, amber colored wines, welcoming atmosphere --ar 16:9"
  },
  {
    name: "under-50-orange-wine",
    folder: "articles",
    prompt: "quality orange wine selection, amber wines in elegant glasses, modern minimal setting, warm lighting, sophisticated but accessible --ar 16:9"
  },

  // === Buy section articles ===
  {
    name: "natural-wine-price",
    folder: "articles",
    prompt: "natural wine bottles with visible price tags, wine shop display, range of prices shown, helpful buying guide aesthetic, warm lighting --ar 16:9"
  },
  {
    name: "price-natural-wine",
    folder: "articles",
    prompt: "wine shop interior with natural wine section, price comparison display, helpful shopping environment, warm inviting atmosphere --ar 16:9"
  },
];

const outputDir = path.join(process.cwd(), "src/assets/images");

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    const protocol = url.startsWith("https") ? https : http;

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }

      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function generateImage(config) {
  const folderPath = path.join(outputDir, config.folder);
  const filepath = path.join(folderPath, `${config.name}.png`);

  // Skip if already exists
  if (fs.existsSync(filepath)) {
    console.log(`⏭️  Skipping ${config.name} (already exists)`);
    return;
  }

  // Ensure folder exists
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  console.log(`🎨 Generating ${config.name}...`);

  try {
    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt: config.prompt,
          num_outputs: 1,
          aspect_ratio: "16:9",
          output_format: "png",
          output_quality: 90,
        }
      }
    );

    const imageUrl = String(output[0]);
    await downloadImage(imageUrl, filepath);
    console.log(`✅ Saved ${config.name}.png`);

  } catch (error) {
    console.error(`❌ Failed to generate ${config.name}:`, error.message);
  }
}

async function main() {
  console.log(`\n🍷 Wine Quick Start Image Generator\n`);
  console.log(`Generating ${images.length} images using Flux on Replicate...\n`);

  // Process images sequentially with rate limiting
  // Free tier: 6 requests/minute, so wait 10s between each
  for (let i = 0; i < images.length; i++) {
    const config = images[i];
    await generateImage(config);

    // Progress indicator
    const remaining = images.length - i - 1;
    if (remaining > 0) {
      console.log(`   ⏳ ${remaining} images remaining, waiting 10s for rate limit...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  console.log(`\n✨ Done! Check src/assets/images/articles/\n`);
}

main().catch(console.error);
