import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const src = (p: string) => fileURLToPath(new URL(`../../src/${p}`, import.meta.url))

// 見本のページ。npm の部品の代わりに、このリポジトリの src/ をそのまま使う（公開前でも試せる）
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@shiodome47/sekisho-town/style.css', replacement: src('style.css') },
      { find: '@shiodome47/sekisho-town/core', replacement: src('core/index.ts') },
      { find: '@shiodome47/sekisho-town/cast', replacement: src('cast/index.ts') },
      { find: '@shiodome47/sekisho-town', replacement: src('ui/index.ts') },
    ],
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
