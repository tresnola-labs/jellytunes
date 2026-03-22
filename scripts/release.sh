#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/release.sh <patch|minor|major>

BUMP_TYPE="${1:-}"

if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: pnpm release <patch|minor|major>"
  exit 1
fi

# Ensure working tree is clean
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is not clean. Commit or stash changes first."
  exit 1
fi

# Ensure we're on main
BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != "main" ]]; then
  echo "Error: releases must be created from the main branch (currently on '$BRANCH')."
  exit 1
fi

# Read current version
OLD_VERSION="$(node -p "require('./package.json').version")"
echo "Current version: $OLD_VERSION"

# Bump version (npm version updates package.json, creates commit and tag)
NEW_VERSION="$(npm version "$BUMP_TYPE" --no-git-tag-version)"
NEW_VERSION="${NEW_VERSION#v}"  # strip leading 'v' if present
echo "Bumping to: $NEW_VERSION"

# Commit and tag
git add package.json
git commit -m "chore: bump version to $NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# Push commit and tag
git push origin main
git push origin "v$NEW_VERSION"

echo ""
echo "Building application..."
pnpm run build
pnpm exec electron-builder --publish never

# Build release notes from commits since last tag
PREV_TAG="$(git describe --tags --abbrev=0 HEAD~1 2>/dev/null || echo "")"
if [[ -n "$PREV_TAG" ]]; then
  NOTES="## What's Changed"$'\n\n'
  NOTES+="$(git log --pretty=format:'- %s' "${PREV_TAG}..HEAD~1")"
  RELEASE_NOTES_FLAG=(--notes "$NOTES")
else
  RELEASE_NOTES_FLAG=(--generate-notes)
fi

# Collect release assets — only DMG and source ZIP for this version
RELEASE_DIR="release"
ASSETS=()
for file in "$RELEASE_DIR"/*-"$NEW_VERSION"-mac.dmg "$RELEASE_DIR"/*-"$NEW_VERSION"-mac.zip; do
  [[ -f "$file" ]] && ASSETS+=("$file")
done

if [[ ${#ASSETS[@]} -eq 0 ]]; then
  echo "Warning: no build assets found in $RELEASE_DIR/"
  echo "Creating release without assets..."
  gh release create "v$NEW_VERSION" \
    --title "v$NEW_VERSION" \
    "${RELEASE_NOTES_FLAG[@]}"
else
  echo "Uploading ${#ASSETS[@]} asset(s)..."
  gh release create "v$NEW_VERSION" \
    --title "v$NEW_VERSION" \
    "${RELEASE_NOTES_FLAG[@]}" \
    "${ASSETS[@]}"
fi

echo ""
echo "Release v$NEW_VERSION published!"
echo "https://github.com/oriaflow-labs/jellytunes/releases/tag/v$NEW_VERSION"
