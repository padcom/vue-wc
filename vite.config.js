import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import eslint from 'vite-plugin-eslint'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag.includes('-'),
        },
      },
    }),
    eslint(),
  ],
  optimizeDeps: {
    exclude: ['vuelit'],
  },
  css: {
    postcss: {
      plugins: [
        autoprefixer(),
      ],
    },
  },
})
