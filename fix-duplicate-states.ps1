# Fix duplicate state hooks across all page.tsx files
$files = Get-ChildItem -Recurse -Filter "page.tsx"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw

    # Remove duplicate showAuthModal (keep only one)
    $content = $content -replace 'const\s*\[\s*showAuthModal\s*,\s*setShowAuthModal\s*\]\s*=\s*useState\(false\);\s*const\s*\[\s*showAuthModal\s*,\s*setShowAuthModal\s*\]\s*=\s*useState\(false\);', 'const [showAuthModal, setShowAuthModal] = useState(false);'

    # Remove duplicate activeTab (keep only one)
    $content = $content -replace 'const\s*\[\s*activeTab\s*,\s*setActiveTab\s*\]\s*=\s*useState\("home"\);\s*const\s*\[\s*activeTab\s*,\s*setActiveTab\s*\]\s*=\s*useState\("home"\);', 'const [activeTab, setActiveTab] = useState("home");'

    # Ensure useState import exists
    if ($content -notmatch "useState") {
        $content = $content -replace 'import React.*\n', "import React, { useState } from 'react';`n"
    }

    # Save back cleaned file
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}

Write-Host "✅ Duplicate state hooks cleaned and useState ensured in all page.tsx files!"
