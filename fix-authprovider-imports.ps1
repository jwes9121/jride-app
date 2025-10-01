$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backup_authprovider_$timestamp"

# Create backup folder
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Scan both app and components folders
$folders = @(".\app", ".\components")

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Get-ChildItem -Path $folder -Recurse -Filter "*.tsx" | ForEach-Object {
            $file = $_.FullName
            $content = Get-Content $file -Raw

            # Backup file before changes
            $target = Join-Path $backupDir $file.Substring((Get-Location).Path.Length + 1)
            $targetDir = Split-Path $target
            if (-not (Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }
            Copy-Item $file -Destination $target -Force

            $modified = $false

            # Replace incorrect imports { AuthProvider }
            $newContent = $content -replace "import\s*{\s*AuthProvider\s*}\s*from\s*['""]([^'""]+)['""]", "import AuthProvider from '`$1'"
            if ($newContent -ne $content) {
                $content = $newContent
                $modified = $true
            }

            # Detect if AuthProvider is used but not imported
            if ($content -match "AuthProvider" -and $content -notmatch "import\s+AuthProvider\s+") {
                # Insert import at the top (after "use client" if present)
                if ($content -match "['""]use client['""];?") {
                    $content = $content -replace "(['""]use client['""];?)", "`$1`r`nimport AuthProvider from '@/components/AuthProvider'"
                } else {
                    $content = "import AuthProvider from '@/components/AuthProvider'`r`n" + $content
                }
                $modified = $true
            }

            if ($modified) {
                Set-Content -Path $file -Value $content -Encoding UTF8
                Write-Host "✅ Fixed or added AuthProvider import in $file"
            }
        }
    }
}

Write-Host "`n📦 Backup stored in: $backupDir"
Write-Host "🚀 All AuthProvider imports standardized or added. Now run: npm run dev"
