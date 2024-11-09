import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    port: 5173,
    // Add if you need CORS
    cors: true,
    // Add if you need to specify host
    host: true,
    // Add proxy configuration for API requests
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          // Add any additional proxy configuration if needed
        }
      }
    }
  },
  // Add if you need to specify base URL
  base: '/',
  // Add if you need to configure build options
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
})