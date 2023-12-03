import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import eslint from 'vite-plugin-eslint'
import dts from 'vite-plugin-dts'

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
    dts({ rollupTypes: true }),
  ],
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['es'],
    },
  },
})
