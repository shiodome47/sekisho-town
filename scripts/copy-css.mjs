// 見た目の CSS を dist/ にそのまま写す
import { copyFileSync, mkdirSync } from 'node:fs'

mkdirSync('dist', { recursive: true })
copyFileSync('src/style.css', 'dist/style.css')
