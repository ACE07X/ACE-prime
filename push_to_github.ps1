# Push Ultra ACE to GitHub
# This script will help you push your code to GitHub

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PUSH TO GITHUB" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if remote already exists
$remoteExists = git remote -v 2>$null

if ($remoteExists) {
    Write-Host "Remote repository already configured:" -ForegroundColor Yellow
    Write-Host $remoteExists
    Write-Host ""
    $pushNow = Read-Host "Do you want to push now? (Y/N)"
    
    if ($pushNow -eq "Y" -or $pushNow -eq "y") {
        Write-Host ""
        Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
        git branch -M main
        git push -u origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "SUCCESS: Code pushed to GitHub!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "ERROR: Push failed. Check your credentials and try again." -ForegroundColor Red
        }
    }
} else {
    Write-Host "No remote repository configured yet." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Create new repository on GitHub" -ForegroundColor Cyan
    Write-Host "  1. Go to: https://github.com/new" -ForegroundColor White
    Write-Host "  2. Repository name: ultra-ace (or any name)" -ForegroundColor White
    Write-Host "  3. Make it Public or Private" -ForegroundColor White
    Write-Host "  4. DO NOT initialize with README" -ForegroundColor White
    Write-Host "  5. Click 'Create repository'" -ForegroundColor White
    Write-Host "  6. Copy the repository URL" -ForegroundColor White
    Write-Host ""
    
    $repoUrl = Read-Host "Enter your GitHub repository URL (or press Enter to skip)"
    
    if (-not [string]::IsNullOrWhiteSpace($repoUrl)) {
        Write-Host ""
        Write-Host "Adding remote repository..." -ForegroundColor Yellow
        git remote add origin $repoUrl
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "SUCCESS: Remote added!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
            git branch -M main
            git push -u origin main
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "SUCCESS: Code pushed to GitHub!" -ForegroundColor Green
                Write-Host ""
                Write-Host "Your repository is now live at:" -ForegroundColor Cyan
                Write-Host $repoUrl -ForegroundColor White
            } else {
                Write-Host ""
                Write-Host "ERROR: Push failed." -ForegroundColor Red
                Write-Host "Make sure you have:" -ForegroundColor Yellow
                Write-Host "  - GitHub credentials configured" -ForegroundColor White
                Write-Host "  - Access to the repository" -ForegroundColor White
                Write-Host ""
                Write-Host "You can also push manually:" -ForegroundColor Yellow
                Write-Host "  git push -u origin main" -ForegroundColor Gray
            }
        } else {
            Write-Host "ERROR: Failed to add remote" -ForegroundColor Red
        }
    } else {
        Write-Host ""
        Write-Host "Skipped. You can add the remote manually:" -ForegroundColor Yellow
        Write-Host "  git remote add origin YOUR_REPO_URL" -ForegroundColor Gray
        Write-Host "  git branch -M main" -ForegroundColor Gray
        Write-Host "  git push -u origin main" -ForegroundColor Gray
    }
}

Write-Host ""
