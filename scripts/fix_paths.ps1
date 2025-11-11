# Script de correction des chemins dans server.js
$serverFile = "c:\Users\BlouD\Documents\StreamLabels\SubcountAutomatic\AutoSubUpdate\server\server.js"
$content = Get-Content $serverFile -Raw

Write-Host "Correction des chemins dans server.js..." -ForegroundColor Cyan

# Logs vers logs/
$content = $content -replace "path\.join\(ROOT_DIR, 'subcount_logs\.txt'\)", "path.join(ROOT_DIR, 'logs', 'subcount_logs.txt')"
$content = $content -replace "path\.join\(ROOT_DIR, 'subcount_backup\.txt'\)", "path.join(ROOT_DIR, 'data', 'subcount_backup.txt')"

# Config Twitch vers data/
$content = $content -replace "path\.join\(ROOT_DIR, 'twitch_config\.txt'\)", "path.join(ROOT_DIR, 'data', 'twitch_config.txt')"

# Fichiers de compteurs vers data/
$content = $content -replace "path\.join\(ROOT_DIR, 'total_followers_count\.txt'\)", "path.join(ROOT_DIR, 'data', 'total_followers_count.txt')"
$content = $content -replace "path\.join\(ROOT_DIR, 'total_followers_count_goal\.txt'\)", "path.join(ROOT_DIR, 'data', 'total_followers_count_goal.txt')"
$content = $content -replace "path\.join\(ROOT_DIR, 'total_subscriber_count\.txt'\)", "path.join(ROOT_DIR, 'data', 'total_subscriber_count.txt')"
$content = $content -replace "path\.join\(ROOT_DIR, 'total_subscriber_count_goal\.txt'\)", "path.join(ROOT_DIR, 'data', 'total_subscriber_count_goal.txt')"

# Sauvegarder
Set-Content $serverFile $content -Encoding UTF8
Write-Host "✅ Chemins corriges dans server.js" -ForegroundColor Green

# Compter les corrections
$corrections = @(
    "subcount_logs.txt -> logs/",
    "subcount_backup.txt -> data/",
    "twitch_config.txt -> data/",
    "total_followers_count.txt -> data/",
    "total_followers_count_goal.txt -> data/",
    "total_subscriber_count.txt -> data/",
    "total_subscriber_count_goal.txt -> data/"
)

Write-Host "`nCorrections appliquees:" -ForegroundColor Yellow
$corrections | ForEach-Object { Write-Host "  + $_" }
