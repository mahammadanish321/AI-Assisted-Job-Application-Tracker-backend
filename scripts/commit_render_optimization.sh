#!/bin/bash

echo "=========================================="
echo "Committing Render Optimization Changes"
echo "=========================================="
echo ""

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Skipping commit."
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")/.." || exit 1

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not a git repository. Skipping commit."
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# Stage all changes
echo "📦 Staging changes..."
git add -A

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "✓ No changes to commit"
    exit 0
fi

# Show what's being committed
echo "📝 Files being committed:"
git diff --cached --name-only
echo ""

# Commit with comprehensive message
COMMIT_MESSAGE="chore: optimize deployment for Render production

- Add render.yaml with optimized build and deployment configuration
- Implement non-blocking server startup with background MongoDB connection
- Add exponential backoff retry logic for database connection failures
- Optimize Gmail sync with parallel batch processing (10 concurrent requests)
- Replace heavy dependencies: googleapis → google-auth-library, bcrypt → bcryptjs
- Move @types packages to devDependencies for smaller production builds
- Enable TypeScript incremental compilation for faster rebuilds
- Add comprehensive deployment documentation and monitoring utilities
- Implement health check endpoint for Render readiness detection
- Add .npmrc and .dockerignore for optimized builds
- Expected deployment time reduced from 30+ minutes to 5-10 minutes

Fixes: Slow deployment process, high initial startup time, heavy dependency footprint"

echo "📤 Committing changes..."
git commit -m "$COMMIT_MESSAGE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Commit successful!"
    echo ""
    echo "📊 Commit stats:"
    git log -1 --stat
    echo ""
    echo "=========================================="
    echo "Ready to push to remote repository"
    echo "=========================================="
else
    echo "❌ Commit failed"
    exit 1
fi
