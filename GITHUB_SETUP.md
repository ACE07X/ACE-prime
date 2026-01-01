# GitHub Setup Instructions for ACE Prime

## Quick Setup

### Option 1: Use the PowerShell Script (Recommended)

1. Open PowerShell in the `ace-prime` directory
2. Run the script:
   ```powershell
   .\push-to-github.ps1
   ```

### Option 2: Manual Git Commands

If Git is installed but not in PATH, follow these steps:

1. **Open Git Bash or PowerShell** in the `ace-prime` directory

2. **Initialize Git** (if not already initialized):
   ```bash
   git init
   ```

3. **Add GitHub remote** (replace with your actual GitHub username if different):
   ```bash
   git remote add origin https://github.com/Thahertech/ACE-prime.git
   ```
   
   Or if the repository already exists and you want to update the remote:
   ```bash
   git remote set-url origin https://github.com/Thahertech/ACE-prime.git
   ```

4. **Add all files**:
   ```bash
   git add .
   ```

5. **Commit the changes**:
   ```bash
   git commit -m "Initial commit: ACE Prime Discord bot with dual-persona system and OpenAI integration"
   ```

6. **Push to GitHub**:
   ```bash
   git branch -M main
   git push -u origin main
   ```

## If Git is Not Installed

1. Download Git for Windows from: https://git-scm.com/download/win
2. Install it (make sure to select "Add Git to PATH" during installation)
3. Restart your terminal/PowerShell
4. Run the commands above or use the PowerShell script

## Repository Name

The script assumes your GitHub repository is named `ACE-prime` under the username `Thahertech`.

If your repository name or username is different, update the remote URL:
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

## Authentication

When pushing, you may be prompted for credentials. You can use:
- **Personal Access Token** (recommended): Generate one at https://github.com/settings/tokens
- **GitHub CLI**: Install from https://cli.github.com/ and run `gh auth login`

## Troubleshooting

### "Git is not recognized"
- Install Git or add it to your PATH
- Restart your terminal after installation

### "Repository not found"
- Make sure the repository `ACE-prime` exists on GitHub
- Check that you have the correct username

### "Permission denied"
- Check your GitHub credentials
- Use a Personal Access Token instead of password
- Ensure you have push permissions to the repository

