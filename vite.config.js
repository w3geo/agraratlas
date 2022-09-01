import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { pluginUnused as unused } from '@gatsbylabs/vite-plugin-unused';

// https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vite-plugin
import vuetify from 'vite-plugin-vuetify';

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
});
