import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vite-plugin
import vuetify from 'vite-plugin-vuetify';

const _dirname = dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  base: '',
  build: {
    sourcemap: true,
    cssCodeSplit: false,
  },
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  resolve: {
    alias: {
      // https://github.com/Turfjs/turf/issues/2200#issuecomment-1085439431
      rbush: `${_dirname}/node_modules/rbush/rbush.js`,
      '/map/style-pmtiles.json': `${_dirname}/dist/map/style-pmtiles.json`,
    },
  },
  define: {
    'import.meta.env.VITE_TRACKER_SCRIPT': JSON.stringify(process.env.VITE_TRACKER_SCRIPT || ''), // eslint-disable-line no-undef
  },
});
