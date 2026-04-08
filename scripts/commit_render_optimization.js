#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

console.log('==========================================');
console.log('Committing Render Optimization Changes');
console.log('==========================================');
console.log('');

try {
  // Check if we're in a git repository
  execSync('git rev-parse --git-dir', { cwd: projectRoot, stdio: 'ignore' });
} catch {
  console.log('❌ Not a git repository. Skipping commit.');
  process.exit(1);
}

try {
  // Get current branch
  const branch = execSync('git rev-parse --abbrev-ref HEAD', {
    cwd: projectRoot,
    encoding: 'utf-8'
  }).trim();
  console.log(`Current branch: ${branch}`);
  console.log('');

  // Stage all changes
  console.log('📦 Staging changes...');
  execSync('git add -A', { cwd: projectRoot });

  // Check if there are changes to commit
  const status = execSync('git diff --cached --quiet; echo $?', {
    cwd: projectRoot,
    encoding: 'utf-8'
  }).trim();

  if (status === '0') {
    console.log('✓ No changes to commit');
    process.exit(0);
  }

  // Show what's being committed
  console.log('📝 Files being committed:');
  const files = execSync('git diff --cached --name-only', {
    cwd: projectRoot,
    encoding: 'utf-8'
  });
  console.log(files);

  // Commit with comprehensive message
  const commitMessage = `chore: optimize deployment for Render production

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

Fixes: Slow deployment process, high initial startup time, heavy dependency footprint`;

  console.log('📤 Committing changes...');
  execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
    cwd: projectRoot,
    stdio: 'inherit'
  });

  console.log('');
  console.log('✅ Commit successful!');
  console.log('');
  console.log('📊 Commit stats:');
  execSync('git log -1 --stat', { cwd: projectRoot, stdio: 'inherit' });
  console.log('');
  console.log('==========================================');
  console.log('Ready to push to remote repository');
  console.log('==========================================');
} catch (error) {
  console.error('❌ Commit failed:', error.message);
  process.exit(1);
}
