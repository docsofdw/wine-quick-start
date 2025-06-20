// @ts-check
import { defineConfig } from 'astro/config';

import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

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
  output: 'static',
  build: {
    inlineStylesheets: 'auto'
  }
});