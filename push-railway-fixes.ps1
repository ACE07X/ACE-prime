# Push Railway deployment fixes to GitHub
# This script commits and pushes the Railway configuration fixes

cd C:\Users\Thahertech\Downloads\ace-prime-complete-spine\ace-prime

$gitPath = "C:\Users\Thahertech\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd\git.exe"

# Check if git exists
if (-not (Test-Path $gitPath)) {
    Write-Host "Git not found at expected path. Trying to find git..." -ForegroundColor Yellow
    $gitPath = Get-Command git -ErrorAction SilentlyContinue
    if (-not $gitPath) {
        Write-Host "Error: Git is not available. Please install Git or GitHub Desktop." -ForegroundColor Red
        exit 1
    }
    $gitPath = $gitPath.Source
}

Write-Host "Using Git: $gitPath" -ForegroundColor Green
Write-Host "`n=== Pushing Railway Fixes to GitHub ===" -ForegroundColor Cyan

# Add the changed files
Write-Host "Adding changed files..." -ForegroundColor Yellow
& $gitPath add railway.json
& $gitPath add src/index.ts

# Check if root railway.json exists and add it
if (Test-Path "..\railway.json") {
    & $gitPath add ..\railway.json
    Write-Host "Added root railway.json" -ForegroundColor Green
}

# Check status
Write-Host "`nChecking git status..." -ForegroundColor Yellow
& $gitPath status --short

# Commit changes
Write-Host "`nCommitting changes..." -ForegroundColor Yellow
$commitMessage = "Fix Railway deployment: Add railway.json config and clean up bot code

- Add railway.json with explicit buildCommand to prevent TypeScript build
- Remove messageCreate handler (slash-command only bot)
- Remove unused MessageHandler import
- Clean up unnecessary intents (GuildMessages, MessageContent)
- Fix TypeScript types (error: unknown, error: Error)
- Production-ready code for Railway deployment"

& $gitPath commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Commit may have failed or no changes to commit" -ForegroundColor Yellow
    Write-Host "Checking if there are uncommitted changes..." -ForegroundColor Yellow
    $status = & $gitPath status --porcelain
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Host "No changes to commit. Repository is up to date." -ForegroundColor Green
    } else {
        Write-Host "There are uncommitted changes. Please commit manually." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Changes committed successfully!" -ForegroundColor Green
}

# Push to GitHub
Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
& $gitPath push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/Thahertech/ACE-prime" -ForegroundColor Cyan
    Write-Host "`nRailway should now detect the changes and deploy successfully." -ForegroundColor Green
} else {
    Write-Host "`n❌ Push failed. Please check:" -ForegroundColor Red
    Write-Host "1. Repository 'ACE-prime' exists on GitHub" -ForegroundColor Yellow
    Write-Host "2. You have push permissions" -ForegroundColor Yellow
    Write-Host "3. Your GitHub credentials are configured" -ForegroundColor Yellow
    Write-Host "4. You're on the correct branch (main)" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Complete ===" -ForegroundColor Cyan

