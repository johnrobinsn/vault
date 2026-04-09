import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  resolve: {
    alias: {
      '@vault/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@vault/editor': path.resolve(__dirname, '../../packages/editor/src/index.ts'),
    },
  },
  server: {
    port: 5175,
    strictPort: true,
    fs: {
      allow: ['../..'],
    },
  },
})
