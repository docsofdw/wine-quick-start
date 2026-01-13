// @ts-check
import { defineConfig } from 'astro/config';

import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://winequickstart.com',
  integrations: [
    tailwind(),
    mdx(),
    sitemap({
      customPages: ['https://winequickstart.com/wine-pairings']
    })
  ],
  output: 'server',
  adapter: vercel(),
  build: {
    inlineStylesheets: 'auto'
  },
  image: {
    // Use sharp for image optimization
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  }
});