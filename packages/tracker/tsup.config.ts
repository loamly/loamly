import { defineConfig } from 'tsup'

export default defineConfig([
  // ESM and CJS builds for Node.js/bundlers
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    minify: false,
    outExtension({ format }) {
      return {
        js: format === 'esm' ? '.mjs' : '.cjs',
      }
    },
  },
  // IIFE build for browser script tag (non-minified)
  {
    entry: { 'loamly.iife': 'src/browser.ts' },
    format: ['iife'],
    globalName: 'Loamly',
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    minify: false,
  },
  // IIFE build for CDN (minified)
  {
    entry: { 'loamly.iife.min': 'src/browser.ts' },
    format: ['iife'],
    globalName: 'Loamly',
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    minify: true,
  },
])


