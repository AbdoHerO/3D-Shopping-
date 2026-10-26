import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// `npm run build:artifact` produces a fully relative build (hash routing) that can be
// opened from any sub-path or file host; VITE_BASE lets GitHub Pages serve from /<repo>/.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = mode === 'artifact' ? './' : env.VITE_BASE || '/'
  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three/')) return 'three'
            if (id.includes('@react-three') || id.includes('three-stdlib') || id.includes('troika')) return 'r3f'
            if (id.includes('@supabase')) return 'supabase'
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/unit/**/*.test.ts'],
    },
  }
})
