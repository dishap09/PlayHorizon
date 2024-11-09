import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Enable CORS if needed
    cors: true,
    // Host configuration, set to true if you want it to be accessible outside localhost
    host: true,
    // API Proxy configuration (useful if your backend is on a different port)
    proxy: {
      '/api': {
        target: 'http://localhost:3000',  // Replace with your backend URL
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      }
    }
  },
  // Optional: Base URL for the application (useful for deployments)
  base: '/',
  // Optional: Build options
  build: {
    outDir: 'dist',  // Output directory for the build
    sourcemap: true,  // Enable sourcemaps for easier debugging
  }
});
