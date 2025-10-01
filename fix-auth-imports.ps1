$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backup_authimports_$timestamp"

# Create backup folder
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Scan app + components
$folders = @(".\app", ".\components")

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Get-ChildItem -Path $folder -Recurse -Filter "*.tsx" | ForEach-Object {
            $file = $_.FullName
            $content = Get-Content $file -Raw

            # Backup file before modifying
            $target = Join-Path $backupDir $file.Substring((Get-Location).Path.Length + 1)
            $targetDir = Split-Path $target
            if (-not (Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }
            Copy-Item $file -Destination $target -Force

            $modified = $false

            # --- FIX AUTHPROVIDER ---
            # Replace incorrect { AuthProvider }
            $newContent = $content -replace "import\s*{\s*AuthProvider\s*}\s*from\s*['""]([^'""]+)['""]", "import AuthProvider from '`$1'"
            if ($newContent -ne $content) {
                $content = $newContent
                $modified = $true
            }

            # Add import if AuthProvider is used but not imported
            if ($content -match "\bAuthProvider\b" -and $content -notmatch "import\s+AuthProvider\s+") {
                if ($content -match "['""]use client['""];?") {
                    $content = $content -replace "(['""]use client['""];?)", "`$1`r`nimport AuthProvider from '@/components/AuthProvider'"
                } else {
                    $content = "import AuthProvider from '@/components/AuthProvider'`r`n" + $content
                }
                $modified = $true
            }

            # --- FIX USEAUTH ---
            # Replace incorrect { useAuth }
            $newContent = $content -replace "import\s*{\s*useAuth\s*}\s*from\s*['""]([^'""]+)['""]", "import { useAuth } from '@/components/AuthProvider'"
            if ($newContent -ne $content) {
                $content = $newContent
                $modified = $true
            }

            # Add import if useAuth is used but not imported
            if ($content -match "\buseAuth\b" -and $content -notmatch "import\s*{\s*useAuth\s*}") {
                if ($content -match "['""]use client['""];?") {
                    $content = $content -replace "(['""]use client['""];?)", "`$1`r`nimport { useAuth } from '@/components/AuthProvider'"
                } else {
                    $content = "import { useAuth } from '@/components/AuthProvider'`r`n" + $content
                }
                $modified = $true
            }

            if ($modified) {
                Set-Content -Path $file -Value $content -Encoding UTF8
                Write-Host "✅ Fixed imports in $file"
            }
        }
    }
}

Write-Host "`n📦 Backup stored in: $backupDir"
Write-Host "🚀 All AuthProvider & useAuth imports standardized. Now run: npm run dev"
