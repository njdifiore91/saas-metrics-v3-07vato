import { defineConfig } from 'vite'; // ^4.3.9
import react from '@vitejs/plugin-react'; // ^4.0.1
import tsconfigPaths from 'vite-tsconfig-paths'; // ^4.2.0
import path from 'path';

export default defineConfig({
  // React plugin configuration with optimized settings
  plugins: [
    react({
      fastRefresh: true,
      runtime: 'automatic',
      babel: {
        plugins: [
          ['@babel/plugin-transform-runtime'],
        ],
      },
    }),
    tsconfigPaths(),
  ],

  // Module resolution and path aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },

  // Development server configuration
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    cors: {
      origin: ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    },
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
    },
  },

  // Production build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor chunks
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // UI framework chunks
          mui: ['@mui/material', '@mui/icons-material'],
          // State management chunks
          redux: ['@reduxjs/toolkit', 'react-redux'],
          // Data visualization chunks
          charts: ['d3'],
          // Form handling chunks
          forms: ['react-hook-form', 'yup'],
          // Utility chunks
          utils: ['lodash', 'date-fns'],
        },
      },
    },
  },

  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@reduxjs/toolkit',
      'd3',
      'react-hook-form',
      'yup',
      'lodash',
      'date-fns',
    ],
    exclude: ['@fsouza/prettierd'],
  },

  // Preview server configuration
  preview: {
    port: 3000,
    strictPort: true,
    host: true,
    cors: true,
  },

  // ESBuild configuration
  esbuild: {
    jsxInject: "import React from 'react'",
    target: ['chrome89', 'firefox89', 'safari14', 'edge89'],
  },

  // Performance optimizations
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase',
    },
  },
});