// Budowanie szkieletu (plik w app/, bo tu są biblioteki) (Ionic + Vue) do jednego pliku: app/www/moduly/szkielet/lib/szkielet.js (+ .css).
// Źródła w moduly/szkielet/src, biblioteki z app/node_modules (dokładne wersje w app/package.json, rejestr docs/ZALEZNOSCI.md).
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const tu = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../moduly/szkielet');
const nm = path.resolve(tu, '../../app/node_modules');
export default defineConfig({
  root: tu,
  plugins: [vue()],
  resolve: { alias: [{ find: /^(vue|vue-router|@ionic\/vue|@ionic\/core|ionicons|@stencil\/vue-output-target)(\/.*)?$/, replacement: nm + '/$1$2' }] },
  define: { 'process.env.NODE_ENV': '"production"', __VUE_OPTIONS_API__: 'false', __VUE_PROD_DEVTOOLS__: 'false', __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false' },
  build: {
    outDir: path.resolve(tu, '../../app/www/moduly/szkielet/lib'), emptyOutDir: true, sourcemap: false, minify: true,
    lib: { entry: path.resolve(tu, 'src/main.js'), formats: ['iife'], name: 'OESTSzkielet', fileName: () => 'szkielet.js', cssFileName: 'szkielet' }
  }
});
