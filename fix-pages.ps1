$pages = Get-ChildItem -Path ".\app" -Recurse -Filter "page.tsx"

foreach ($page in $pages) {
    Write-Host "🔍 Checking $($page.FullName)"

    $content = Get-Content $page.FullName -Raw

    # Ensure "use client"; is at the top if hooks are used
    if ($content -match "useState|useEffect") {
        if ($content -notmatch '"use client"') {
            $content = '"use client";' + "`r`n`r`n" + $content
        }
    }

    # If file has return(<div>) but no "export default function"
    if ($content -match "return\s*\(" -and $content -notmatch "export default function") {
        $content = @"
"use client";

import React from "react";

export default function Page() {
$content
}
"@
    }

    # Fix AuthModal usages without props
    $content = $content -replace "<AuthModal\s*onClose=\{[^}]+\}\s*/>", '<AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onAuthSuccess={() => setShowAuthModal(false)} mode="signin" />'

    Set-Content -Path $page.FullName -Value $content -Encoding UTF8
    Write-Host "✅ Fixed $($page.FullName)"
}

Write-Host "`n🎯 All page.tsx files processed. Now run: npm run build"
