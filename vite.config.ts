import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@main': resolve(__dirname, 'src/main'),
      '@core': resolve(__dirname, 'src/core'),
      '@types': resolve(__dirname, 'src/types'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@adapters': resolve(__dirname, 'src/adapters')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@use "@renderer/styles/variables" as *;'
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html')
      }
    }
  }
});
