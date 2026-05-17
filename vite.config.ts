import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          if (options.startup) {
            void options.startup()
          } else {
            void options.reload()
          }
        },
        vite: {
          build: {
            sourcemap: true,
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['node-pty'],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          void options.reload()
        },
        vite: {
          build: {
            sourcemap: true,
            outDir: 'dist-electron/preload',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    exclude: ['electron/**', 'dist/**', 'node_modules/**'],
  },
  clearScreen: false,
  build: {
    outDir: 'out',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          xterm: [
            'xterm',
            'xterm-addon-fit',
            '@xterm/addon-search',
            'xterm-addon-web-links',
            'xterm-addon-webgl',
            '@xterm/addon-serialize',
          ],
        },
      },
    },
  },
})
