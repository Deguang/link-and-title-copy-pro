import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  plugins: [
    react(),
    createHtmlPlugin({
      minify: true,
      pages: [
        {
          entry: '/src/options/options.jsx',
          filename: 'options.html',
          template: 'src/options/options.html',
          injectOptions: {
            data: {
              title: 'Extension Options',
            },
          },
        },
      ],
    }),
    {
      name: 'cleanup-and-copy-extension-files',
      buildStart() {
        if (existsSync('dist')) {
          rmSync('dist', { recursive: true, force: true });
          console.log('Cleaned up dist directory');
        }
        mkdirSync('dist');
        console.log('Created new dist directory');
      },
      closeBundle() {
        try {
          if (existsSync('public/manifest.json')) {
            copyFileSync('public/manifest.json', 'dist/manifest.json');
            console.log('Copied manifest.json from public directory');
          } else if (existsSync('manifest.json')) {
            copyFileSync('manifest.json', 'dist/manifest.json');
            console.log('Copied manifest.json from root directory');
          } else {
            console.error('manifest.json not found in public directory or root directory');
          }

          if (existsSync('src/icons')) {
            cpSync('src/icons', 'dist/icons', { recursive: true });
            console.log('Copied icons directory');
          } else {
            console.log('Icons directory not found, skipping...');
          }

          if (existsSync('_locales')) {
            cpSync('_locales', 'dist/_locales', { recursive: true });
            console.log('Copied _locales directory');
          } else {
            console.log('_locales directory not found, skipping...');
          }
        } catch (error) {
          console.error('Error during file copying:', error);
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        options: resolve(__dirname, 'src/options/options.html'),
        background: resolve(__dirname, 'src/background/background.js'),
        content: resolve(__dirname, 'src/content/content.js'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          let extType = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = 'img';
          } else if (/woff|woff2/.test(extType)) {
            extType = 'css';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});