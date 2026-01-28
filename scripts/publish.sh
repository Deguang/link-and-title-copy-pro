#!/bin/bash

# Exit on error
set -e

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "Error: 'gh' CLI is not installed. Please install it to use this script."
    exit 1
fi

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Ensure we are in project root
cd "$PROJECT_ROOT"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"

echo "🚀 Starting release process for version ${VERSION}..."

# Run release build
echo "📦 Building and packaging..."
npm run release

# Check if tag exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "⚠️  Tag $TAG already exists locally."
else
    echo "🏷️  Creating git tag $TAG..."
    git tag "$TAG"
fi

# Push tag
echo "⬆️  Pushing tag to remote..."
git push origin "$TAG"

# Create GitHub release
ZIP_FILE="releases/link-and-title-copy-pro-${TAG}.zip"

if [ ! -f "$ZIP_FILE" ]; then
    echo "❌ Error: Release file $ZIP_FILE not found!"
    exit 1
fi

echo "📢 Creating GitHub release..."
if gh release view "$TAG" >/dev/null 2>&1; then
    echo "⚠️  Release $TAG already exists. Skipping release creation."
else
    gh release create "$TAG" "$ZIP_FILE" --title "$TAG" --notes "Release $TAG"
    echo "✅ GitHub release created successfully!"
fi

echo "🎉 Done!"
