import { defineConfig } from 'astro/config';
import vercelServerless from '@astrojs/vercel/serverless';

import react from '@astrojs/react';

export default defineConfig({
  output: 'server',

  adapter: vercelServerless({
    imageService: true,
  }),

  integrations: [react()],

  vite: {
    define: {
      "process.env.IS_PREACT": JSON.stringify("true"),
    },
  }
});