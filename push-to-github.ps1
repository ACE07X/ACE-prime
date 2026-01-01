# PowerShell script to push ACE Prime to GitHub
# Run this script from the ace-prime directory

Write-Host "=== ACE Prime GitHub Push Script ===" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Please run this script from the ace-prime directory." -ForegroundColor Red
    exit 1
}

# Check if git is available
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Host "Error: Git is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Git from https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "Or add Git to your PATH environment variable." -ForegroundColor Yellow
    exit 1
}

Write-Host "Git found: $($gitCmd.Source)" -ForegroundColor Green

# Initialize git repository if needed
if (-not (Test-Path ".git")) {
    Write-Host "Initializing git repository..." -ForegroundColor Yellow
    git init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to initialize git repository" -ForegroundColor Red
        exit 1
    }
}

# Check current remote
$remoteUrl = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    # No remote configured, add it
    Write-Host "Adding GitHub remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/Thahertech/ACE-prime.git
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to add remote. Please check your repository name." -ForegroundColor Red
        exit 1
    }
    Write-Host "Remote added: https://github.com/Thahertech/ACE-prime.git" -ForegroundColor Green
} else {
    Write-Host "Remote already configured: $remoteUrl" -ForegroundColor Green
    # Update if needed
    git remote set-url origin https://github.com/Thahertech/ACE-prime.git
}

# Add all files
Write-Host "Adding files to git..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to add files" -ForegroundColor Red
    exit 1
}

# Check if there are changes to commit
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to commit. Repository is up to date." -ForegroundColor Green
} else {
    # Commit changes
    Write-Host "Committing changes..." -ForegroundColor Yellow
    git commit -m "Initial commit: ACE Prime Discord bot with dual-persona system and OpenAI integration"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to commit changes" -ForegroundColor Red
        exit 1
    }
    Write-Host "Changes committed successfully" -ForegroundColor Green
}

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "Note: You may be prompted for GitHub credentials." -ForegroundColor Cyan

# Try to push to main branch first, then master
$branches = @("main", "master")
$pushed = $false

foreach ($branch in $branches) {
    $branchExists = git branch --list $branch 2>$null
    if ($branchExists) {
        Write-Host "Pushing to $branch branch..." -ForegroundColor Yellow
        git push -u origin $branch
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
            $pushed = $true
            break
        }
    }
}

if (-not $pushed) {
    # Create and push to main branch
    Write-Host "Creating main branch and pushing..." -ForegroundColor Yellow
    git branch -M main
    git push -u origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
        $pushed = $true
    }
}

if (-not $pushed) {
    Write-Host "Error: Failed to push to GitHub" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Your GitHub credentials are configured" -ForegroundColor Yellow
    Write-Host "  2. The repository 'ACE-prime' exists on GitHub" -ForegroundColor Yellow
    Write-Host "  3. You have push permissions to the repository" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Push Complete ===" -ForegroundColor Cyan
Write-Host "Repository: https://github.com/Thahertech/ACE-prime" -ForegroundColor Green

