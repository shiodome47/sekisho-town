import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/ui/index.ts', 'core/index': 'src/core/index.ts', 'cast/index': 'src/cast/index.ts' },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: false,
  splitting: true,
  target: 'es2020',
  external: ['react', 'react/jsx-runtime', 'react-dom', '@shiodome47/sekisho', '@shiodome47/sekisho/core'],
  // Next.js の App Router でも、そのまま使えるように（画面はブラウザで動く）
  banner: { js: "'use client'" },
})
