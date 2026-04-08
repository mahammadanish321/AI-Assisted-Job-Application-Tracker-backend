#!/usr/bin/env python3
import subprocess
import os
import sys

def run_command(cmd, cwd=None):
    """Run a command and return output"""
    try:
        result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return 1, "", str(e)

def main():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    print("\n==========================================")
    print("Committing Render Optimization Changes")
    print("==========================================\n")
    
    # Check if git is initialized
    code, _, _ = run_command("git rev-parse --git-dir", cwd=project_root)
    if code != 0:
        print("❌ Not a git repository. Run 'git init' first.")
        return 1
    
    # Get current branch
    code, branch, _ = run_command("git rev-parse --abbrev-ref HEAD", cwd=project_root)
    if code == 0:
        print(f"Current branch: {branch.strip()}")
    
    # Stage all changes
    print("📦 Staging changes...")
    run_command("git add -A", cwd=project_root)
    
    # Check if there are changes
    code, status, _ = run_command("git status --porcelain", cwd=project_root)
    if not status.strip():
        print("✓ No changes to commit")
        return 0
    
    print(f"📝 Changes to commit:\n{status}")
    
    # Commit
    commit_message = """chore: optimize deployment for Render production

- Add render.yaml with optimized build and deployment configuration
- Implement non-blocking server startup with background MongoDB connection
- Add exponential backoff retry logic for database connection failures
- Optimize Gmail sync with parallel batch processing (10 concurrent requests)
- Replace heavy dependencies: googleapis → google-auth-library, bcrypt → bcryptjs
- Move @types packages to devDependencies for smaller production builds
- Convert to ES modules with proper .js extensions for Node.js compatibility
- Enable TypeScript incremental compilation for faster rebuilds
- Add comprehensive deployment documentation and monitoring utilities
- Implement health check endpoint for Render readiness detection
- Add .npmrc and .dockerignore for optimized builds
- Expected deployment time reduced from 30+ minutes to 5-10 minutes

Fixes: Slow deployment process, high initial startup time, heavy dependency footprint"""

    print("📤 Committing changes...")
    code, _, err = run_command(f'git commit -m "{commit_message}"', cwd=project_root)
    
    if code != 0:
        print(f"❌ Commit failed: {err}")
        return 1
    
    print("✅ Commit successful!")
    
    # Show commit info
    run_command("git log -1 --stat", cwd=project_root)
    
    print("\n==========================================")
    print("Ready to push to remote repository")
    print("==========================================\n")
    return 0

if __name__ == "__main__":
    sys.exit(main())
