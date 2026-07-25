#!/bin/bash
#
# One-command release helper. Verifies, builds, and packages the current version,
# then prints the exact git/gh commands to publish. It deliberately does NOT push
# or create the GitHub release itself — those are outward-facing and stay a
# conscious, manual step.
#
# Usage: npm run ship
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
cd "$ROOT"

VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"

echo "🔎 Verifying v${VERSION} ..."
npm run lint
npm test
npm run build

echo "📦 Packaging ..."
./scripts/release.sh
ZIP="releases/link-and-title-copy-pro-${TAG}.zip"

# Changelog since the previous tag (fallback: whole history).
PREV_TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)
echo ""
echo "===================================================================="
echo "  Ready to ship ${TAG}"
echo "  Artifact: ${ZIP}"
echo "===================================================================="
echo ""
if [ -n "$PREV_TAG" ]; then
  echo "Changes since ${PREV_TAG}:"
  git log "${PREV_TAG}..HEAD" --pretty='  - %s' --no-merges
else
  echo "Changes:"
  git log --pretty='  - %s' --no-merges | head -20
fi
echo ""
echo "To publish, review and run:"
echo "  git tag ${TAG} && git push origin HEAD ${TAG}"
echo "  gh release create ${TAG} ${ZIP} --title \"${TAG}\" --notes \"...\""
echo ""
