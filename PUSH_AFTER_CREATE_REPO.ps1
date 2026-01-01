# Run this AFTER creating the repository on GitHub
# This will push your code to the newly created repository

cd C:\Users\Thahertech\Downloads\ace-prime-complete-spine\ace-prime

$gitPath = "C:\Users\Thahertech\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd\git.exe"

Write-Host "Pushing to GitHub..." -ForegroundColor Cyan

# Rename branch to main if needed
& $gitPath branch -M main

# Push to GitHub
& $gitPath push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSuccessfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/Thahertech/ACE-prime" -ForegroundColor Cyan
} else {
    Write-Host "`nPush failed. Please check:" -ForegroundColor Red
    Write-Host "1. Repository 'ACE-prime' exists on GitHub" -ForegroundColor Yellow
    Write-Host "2. You have push permissions" -ForegroundColor Yellow
    Write-Host "3. Your GitHub credentials are configured" -ForegroundColor Yellow
}

