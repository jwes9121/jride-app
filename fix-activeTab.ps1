# === fix-activeTab.ps1 ===
Write-Host "🚀 Starting patch for activeTab issues..."

# --- Step 1: Fix next.config.js ---
$nextConfigPath = "next.config.js"
if (Test-Path $nextConfigPath) {
    Copy-Item $nextConfigPath "$nextConfigPath.bak" -Force
    @"
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true
};

module.exports = nextConfig;
"@ | Set-Content $nextConfigPath -Encoding UTF8
    Write-Host "✅ Patched next.config.js"
}

# --- Step 2: Scan all page.tsx files ---
Get-ChildItem -Path "app" -Recurse -Filter "page.tsx" | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw

    if ($content -match "BottomNavigation" -and $content -notmatch "activeTab") {
        Copy-Item $file "$file.bak" -Force

        # Inject state hooks at the top of the component
        $content = $content -replace "(export default function \w+\(\)\s*\{)", "`$1`r`n  const [activeTab, setActiveTab] = useState('home');`r`n  const [showAuthModal, setShowAuthModal] = useState(false);"

        # Ensure import useState exists
        if ($content -notmatch "useState") {
            $content = $content -replace "(import\s+)", "import { useState } from 'react';`r`n`$1"
        }

        Set-Content $file $content -Encoding UTF8
        Write-Host "🛠 Fixed $file"
    }
}

Write-Host "🎉 Patch complete! Run: npm run build"
