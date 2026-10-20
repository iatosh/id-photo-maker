import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // tools.iatosh.com/id-photo-maker/ で配信する。Workers の静的アセットはリクエストパスと
  // 同じディレクトリ構成で置く必要があるため、出力先もパスに合わせる。
  base: '/id-photo-maker/',
  build: {
    outDir: 'dist/id-photo-maker',
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
  },
})
