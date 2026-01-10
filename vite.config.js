import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { createHtmlPlugin } from 'vite-plugin-html';

// 通用的文件处理插件
const fileHandlingPlugin = {
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
      // 复制 manifest.json
      if (existsSync('public/manifest.json')) {
        copyFileSync('public/manifest.json', 'dist/manifest.json');
        console.log('Copied manifest.json from src directory');
      } else if (existsSync('manifest.json')) {
        copyFileSync('manifest.json', 'dist/manifest.json');
        console.log('Copied manifest.json from root directory');
      } else {
        console.error('manifest.json not found');
      }

      // 复制图标文件夹
      if (existsSync('src/icons')) {
        cpSync('src/icons', 'dist/icons', { recursive: true });
        console.log('Copied icons directory');
      } else {
        console.log('Icons directory not found, skipping...');
      }

      // 复制多语言文件
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
};

// 主配置
export default defineConfig(({ command, mode }) => {
  return {
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
      fileHandlingPlugin
    ],
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          options: resolve(__dirname, 'src/options/options.html'),
          background: resolve(__dirname, 'src/background/background.js'),
          content: resolve(__dirname, 'src/content/content.js'),
          offscreen: resolve(__dirname, 'src/offscreen/offscreen.html'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            // content.js 直接输出到根目录，其他文件保持原样
            if (chunkInfo.name === 'content') {
              return 'content.js';
            }
            return '[name].js';
          },
          chunkFileNames: '[name].[hash].js',
          format: 'es',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            let extType = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return `icons/[name][extname]`;
            } else if (/woff|woff2/.test(extType)) {
              return `assets/css/[name][extname]`;
            }
            return `assets/[name][extname]`;
          },
        }
      }
    },
    css: {
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer'),
        ],
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  };
});