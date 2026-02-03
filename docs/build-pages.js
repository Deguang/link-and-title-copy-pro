#!/usr/bin/env node

/**
 * Build script to generate localized landing pages from template
 * Usage: node build-pages.js
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '.');
const I18N_DIR = path.join(DOCS_DIR, 'i18n');
const TEMPLATE_PATH = path.join(DOCS_DIR, 'template.html');

// Languages to build (filename without .json)
const LANGUAGES = ['en', 'zh', 'zh-TW', 'ja', 'ru', 'hi'];

// Output file mapping
const OUTPUT_FILES = {
  'en': 'index.html',
  'zh': 'zh.html',
  'zh-TW': 'zh-TW.html',
  'ja': 'ja.html',
  'ru': 'ru.html',
  'hi': 'hi.html'
};

/**
 * Deep get a value from an object using dot notation
 */
function getValue(obj, path) {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value === undefined || value === null) return undefined;
    value = value[key];
  }
  return value;
}

/**
 * Process simple mustache-style placeholders: {{key}} or {{key.nested}}
 */
function processPlaceholders(template, data) {
  // Handle simple placeholders {{key}} or {{key.nested.path}}
  return template.replace(/\{\{([^#/}]+)\}\}/g, (match, key) => {
    const value = getValue(data, key.trim());
    if (value === undefined) {
      console.warn(`  Warning: Missing key "${key.trim()}"`);
      return match; // Keep original if not found
    }
    return String(value);
  });
}

/**
 * Process array sections: {{#array}}...{{/array}}
 */
function processArrays(template, data) {
  // Handle array sections {{#langSwitch.items}}...{{/langSwitch.items}}
  const arrayPattern = /\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  
  return template.replace(arrayPattern, (match, arrayPath, innerTemplate) => {
    const array = getValue(data, arrayPath.trim());
    if (!Array.isArray(array)) {
      console.warn(`  Warning: "${arrayPath}" is not an array`);
      return '';
    }
    
    return array.map(item => {
      // Replace item-level placeholders
      return innerTemplate.replace(/\{\{([^#/}]+)\}\}/g, (m, key) => {
        const value = item[key.trim()];
        return value !== undefined ? String(value) : m;
      });
    }).join('');
  });
}

/**
 * Build a single language page
 */
function buildPage(lang) {
  const i18nPath = path.join(I18N_DIR, `${lang}.json`);
  const outputPath = path.join(DOCS_DIR, OUTPUT_FILES[lang]);
  
  // Read language file
  const langData = JSON.parse(fs.readFileSync(i18nPath, 'utf8'));
  
  // Read template
  let html = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  
  // Process arrays first, then simple placeholders
  html = processArrays(html, langData);
  html = processPlaceholders(html, langData);
  
  // Write output
  fs.writeFileSync(outputPath, html, 'utf8');
  
  console.log(`  ✓ Built ${OUTPUT_FILES[lang]}`);
}

/**
 * Main build function
 */
function build() {
  console.log('\n🔨 Building localized landing pages...\n');
  
  // Check if template exists
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error('❌ Template not found:', TEMPLATE_PATH);
    process.exit(1);
  }
  
  // Build each language
  for (const lang of LANGUAGES) {
    const i18nPath = path.join(I18N_DIR, `${lang}.json`);
    if (!fs.existsSync(i18nPath)) {
      console.warn(`  ⚠ Skipping ${lang}: i18n file not found`);
      continue;
    }
    
    try {
      buildPage(lang);
    } catch (error) {
      console.error(`  ❌ Error building ${lang}:`, error.message);
    }
  }
  
  console.log('\n✅ Build complete!\n');
}

// Run build
build();
