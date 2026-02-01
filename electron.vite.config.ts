import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@main': resolve(__dirname, 'src/main'),
        '@core': resolve(__dirname, 'src/core'),
        '@types': resolve(__dirname, 'src/types'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@adapters': resolve(__dirname, 'src/adapters')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  },
  renderer: {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@renderer': resolve(__dirname, 'src/renderer'),
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
    }
  }
});
