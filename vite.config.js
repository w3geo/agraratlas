import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { pluginUnused as unused } from '@gatsbylabs/vite-plugin-unused';
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
    unused({
      ext: ['*.vue', '*.js'],
    }),
  ],
  resolve: {
    alias: {
      // https://github.com/Turfjs/turf/issues/2200#issuecomment-1085439431
      rbush: `${_dirname}/node_modules/rbush/rbush.js`,
    },
  },
});
