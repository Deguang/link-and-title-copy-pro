const tinify = require("tinify");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const key = process.env.TINYPNG_API_KEY;

if (!key) {
  console.error("Error: TINYPNG_API_KEY environment variable is not set.");
  console.error("Usage: TINYPNG_API_KEY=your_key node scripts/compress-images.js");
  process.exit(1);
}

tinify.key = key;

const imagesDir = path.resolve(__dirname, "../docs/images");
const extensions = [".png", ".jpg", ".jpeg", ".webp"];

if (!fs.existsSync(imagesDir)) {
  console.error(`Directory not found: ${imagesDir}`);
  process.exit(1);
}

fs.readdir(imagesDir, (err, files) => {
  if (err) {
    console.error("Error reading directory:", err);
    process.exit(1);
  }

  files.forEach((file) => {
    const ext = path.extname(file).toLowerCase();
    if (extensions.includes(ext)) {
      const filePath = path.join(imagesDir, file);
      // console.log(`Processing ${file}...`);
      
      const source = tinify.fromFile(filePath);
      source.toFile(filePath, (err) => {
        if (err) {
          console.error(`Error compressing ${file}:`, err);
        } else {
          console.log(`Successfully compressed ${file}`);
        }
      });
    }
  });
});
