$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backup_pages_$timestamp"

# Create backup folder
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Copy all page.tsx files
Get-ChildItem -Path ".\app" -Recurse -Filter "page.tsx" | ForEach-Object {
    $target = Join-Path $backupDir $_.FullName.Substring((Get-Location).Path.Length + 1)
    $targetDir = Split-Path $target
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    Copy-Item $_.FullName -Destination $target -Force
    Write-Host "📦 Backed up $($_.FullName) -> $target"
}

Write-Host "`n✅ Backup complete! All page.tsx files are stored in $backupDir"
