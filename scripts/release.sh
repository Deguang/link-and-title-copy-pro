#!/bin/bash

# Exit on error
set -e

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Read version from manifest.json
VERSION=$(node -p "require('$PROJECT_ROOT/dist/manifest.json').version")

# Create releases directory if not exists
mkdir -p "$PROJECT_ROOT/releases"

# Define zip filename
ZIP_NAME="link-and-title-copy-pro-v${VERSION}.zip"
ZIP_PATH="$PROJECT_ROOT/releases/$ZIP_NAME"

# Remove existing zip if exists
rm -f "$ZIP_PATH"

# Create zip from dist folder
cd "$PROJECT_ROOT/dist"
zip -r "$ZIP_PATH" ./*

echo "✅ Release created: releases/$ZIP_NAME"
