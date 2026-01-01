# PowerShell script to set Railway environment variables
# Requires Railway CLI to be installed: npm i -g @railway/cli

Write-Host "🚀 ACE Prime - Railway Environment Variables Setup" -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
$railwayInstalled = Get-Command railway -ErrorAction SilentlyContinue

if (-not $railwayInstalled) {
    Write-Host "❌ Railway CLI is not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Install it with:" -ForegroundColor Yellow
    Write-Host "  npm i -g @railway/cli" -ForegroundColor White
    Write-Host ""
    Write-Host "Or set variables manually in Railway dashboard:" -ForegroundColor Yellow
    Write-Host "  https://railway.app → Your Service → Variables" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Railway CLI found" -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "Checking Railway login status..." -ForegroundColor Yellow
$loginCheck = railway whoami 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not logged in to Railway. Please login first:" -ForegroundColor Yellow
    Write-Host "  railway login" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Logged in to Railway" -ForegroundColor Green
Write-Host ""

# Environment variables to set
$vars = @{
    "DISCORD_TOKEN" = "[YOUR_BOT_TOKEN_HERE]"
    "DISCORD_CLIENT_ID" = "1456227175798669326"
    "NODE_ENV" = "production"
}

Write-Host "Setting environment variables..." -ForegroundColor Yellow
Write-Host ""

foreach ($var in $vars.GetEnumerator()) {
    Write-Host "Setting $($var.Key)..." -ForegroundColor Cyan
    railway variables set "$($var.Key)=$($var.Value)" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $($var.Key) set successfully" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Failed to set $($var.Key)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Environment variables set!" -ForegroundColor Green
Write-Host ""
Write-Host "Railway will automatically redeploy your service." -ForegroundColor Yellow
Write-Host "Check the Railway dashboard for deployment status." -ForegroundColor Yellow
Write-Host ""
Write-Host "Expected logs after deployment:" -ForegroundColor Cyan
Write-Host "  ✅ DISCORD_TOKEN found" -ForegroundColor White
Write-Host "  ✅ DISCORD_CLIENT_ID found" -ForegroundColor White
Write-Host "  ✅ ACE Prime is ONLINE!" -ForegroundColor White
Write-Host ""

