// @ts-check
import { defineConfig } from 'astro/config';

import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://winesquickstart.com',
  integrations: [
    tailwind(),
    mdx(),
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