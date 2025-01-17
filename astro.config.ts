import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

import react from '@astrojs/react';

export default defineConfig({
  output: 'server',

  adapter: vercel({
    imageService: true,
  }),

  integrations: [react()],

  vite: {
    define: {
      "process.env.IS_PREACT": JSON.stringify("true"),
    },
  }
});