import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      path: 'node:path',
      fs: 'node:fs',
    },
  },
  plugins: [],
  test: {
    environment: 'node',
    include: ['electron/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    alias: {
      path: 'node:path',
      fs: 'node:fs',
    },
  },
})
