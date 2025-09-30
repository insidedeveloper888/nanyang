# GitHub Setup Guide

This guide will help you set up GitHub authentication and use the npm scripts to push your changes.

## Prerequisites

1. Make sure you have Node.js and npm installed
2. Make sure you have Git installed
3. You need a GitHub Personal Access Token (PAT)

## Getting Your GitHub Personal Access Token

1. Go to GitHub.com and sign in
2. Click on your profile picture → Settings
3. Scroll down and click "Developer settings"
4. Click "Personal access tokens" → "Tokens (classic)"
5. Click "Generate new token" → "Generate new token (classic)"
6. Give it a name like "Nanyang Logistics Planner"
7. Select the following scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
8. Click "Generate token"
9. **IMPORTANT**: Copy the token immediately (you won't see it again!)

## Setting Up Authentication

### Option 1: Using Environment Variable (Recommended)

1. Open PowerShell or Command Prompt
2. Set your GitHub token as an environment variable:
   ```
   set GITHUB_TOKEN=your_token_here
   ```
   Replace `your_token_here` with your actual token.

3. Now you can use the push command with token:
   ```
   npm run push-with-token
   ```

### Option 2: Configure Git Credentials

1. Set your Git user information:
   ```
   npm run set-user
   ```
   Then manually update with your actual name and email:
   ```
   git config user.name "Your Actual Name"
   git config user.email "your.email@example.com"
   ```

2. Configure Git to use your token:
   ```
   git config credential.helper store
   ```

## Available NPM Scripts

Here are the available commands you can use:

### Basic Git Operations
- `npm run status` - Check git status
- `npm run add` - Add all files to staging
- `npm run commit "Your message"` - Add and commit with message
- `npm run push` - Push to GitHub (requires authentication)
- `npm run pull` - Pull latest changes from GitHub

### Quick Operations
- `npm run quick-push` - Add, commit with timestamp, and push
- `npm run push-with-token` - Push using environment variable token
- `npm run deploy` - Add, commit with "Deploy" message, and push

### Utility Commands
- `npm run help` - Show available commands
- `npm run check-auth` - Check current git user configuration
- `npm run setup-auth` - Show how to set up GitHub token
- `npm run log` - Show recent commits
- `npm run diff` - Show current changes
- `npm run branch` - List branches
- `npm run stash` - Stash current changes
- `npm run stash-pop` - Restore stashed changes

## Usage Examples

1. **Quick push with current changes:**
   ```
   npm run quick-push
   ```

2. **Push with custom commit message:**
   ```
   npm run commit "Fixed logistics planner bug"
   npm run push
   ```

3. **Check what's changed:**
   ```
   npm run status
   npm run diff
   ```

4. **Deploy to production:**
   ```
   npm run deploy
   ```

## Troubleshooting

### Permission Denied Error
If you get a "Permission denied" error, it means:
1. You don't have push access to the repository, OR
2. Your authentication is not set up correctly

**Solution**: Use the `push-with-token` command with your GitHub token set as an environment variable.

### Authentication Failed
If authentication fails:
1. Make sure your GitHub token is valid and not expired
2. Make sure the token has the correct permissions (`repo` scope)
3. Try setting the token again: `set GITHUB_TOKEN=your_token_here`

### Repository Not Found
If you get "repository not found":
1. Make sure the repository URL is correct in package.json
2. Make sure you have access to the repository
3. Check if the repository is private and you have the right permissions

## Security Notes

- Never commit your GitHub token to the repository
- The `.gitignore` file is set up to exclude `.env` files where you might store tokens
- Use environment variables for tokens, not hardcoded values
- Regularly rotate your GitHub tokens for security