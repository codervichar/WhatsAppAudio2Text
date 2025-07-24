import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Disable source maps for faster builds
    sourcemap: false,
    
    // Use esbuild for faster minification
    minify: 'esbuild',
    
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    
    // Rollup options for better performance
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress warnings about PURE comments in react-helmet-async
        if (warning.code === 'ANNOTATION_POSITION' && warning.message.includes('PURE')) {
          return
        }
        warn(warning)
      },
      
      // Optimize output for EC2
      output: {
        // Single chunk for faster builds on limited resources
        manualChunks: undefined,
        // Optimize for smaller memory footprint
        compact: true
      }
    },
    
    // Build optimizations for EC2
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    
    // Disable CSS code splitting for faster builds
    cssCodeSplit: false,
    
    // Reduce memory usage
    reportCompressedSize: false,
    
    // Optimize for EC2 free tier
    emptyOutDir: true
  },
  
  // Optimize dependencies for EC2
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'react-helmet-async'
    ],
    exclude: [],
    // Disable pre-bundling for EC2
    force: false
  },
  
  // Development server optimizations
  server: {
    hmr: true
  },
  
  // Optimize for EC2 free tier
  esbuild: {
    // Reduce memory usage
    target: 'es2015',
    // Disable source maps
    sourcemap: false
  }
})
