import Replicate from "replicate";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// New article images to generate
const images = [
  {
    name: "orange-wine-review",
    folder: "articles",
    prompt: "natural orange wine tasting setup, multiple amber-colored wine bottles and glasses arranged for review, tasting notes paper and pen, professional wine review setting, warm copper and amber tones, soft natural lighting --ar 16:9"
  },
  {
    name: "orange-wine-under-20",
    folder: "articles",
    prompt: "budget-friendly orange wine bottles, price tags showing under 20 dollars, amber colored wines in casual wine shop setting, welcoming and accessible atmosphere, warm lighting --ar 16:9"
  },
  {
    name: "review-orange-wine",
    folder: "articles",
    prompt: "sommelier reviewing orange wine, elegant amber wine in glass being examined, professional tasting environment, soft warm lighting, sophisticated wine evaluation setting --ar 16:9"
  },
  {
    name: "orange-wine-cheap",
    folder: "articles",
    prompt: "affordable orange wine selection displayed on wooden shelf, amber and copper colored wines, casual wine bar setting, budget-friendly labels visible, welcoming warm atmosphere --ar 16:9"
  },
  {
    name: "price-orange-wine",
    folder: "articles",
    prompt: "orange wine bottles with visible price tags in wine shop display, range of prices shown, amber colored skin-contact wines, helpful buying guide aesthetic, warm inviting lighting --ar 16:9"
  },
];

const outputDir = path.join(process.cwd(), "src/assets/images");

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    const protocol = url.startsWith("https") ? https : http;

    protocol.get(url, (response) => {
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

  if (fs.existsSync(filepath)) {
    console.log(`⏭️  Skipping ${config.name} (already exists)`);
    return;
  }

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
  console.log(`\n🍷 Generating ${images.length} new article images...\n`);

  for (let i = 0; i < images.length; i++) {
    const config = images[i];
    await generateImage(config);

    const remaining = images.length - i - 1;
    if (remaining > 0) {
      console.log(`   ⏳ ${remaining} images remaining, waiting 10s for rate limit...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  console.log(`\n✨ Done! New images generated.\n`);
}

main().catch(console.error);
