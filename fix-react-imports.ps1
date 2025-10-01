# fix-react-imports.ps1
$files = Get-ChildItem -Path "app" -Recurse -Include *.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw

    # Remove any standalone useState/useEffect imports
    $content = $content -replace 'import\s*\{\s*useState\s*,\s*useEffect\s*\}\s*from\s*["'']react["''];?\r?\n', ''
    $content = $content -replace 'import\s*\{\s*useState\s*\}\s*from\s*["'']react["''];?\r?\n', ''
    $content = $content -replace 'import\s*\{\s*useEffect\s*\}\s*from\s*["'']react["''];?\r?\n', ''

    # Ensure React import exists and is consistent
    if ($content -notmatch 'import React, \{.*useState.*useEffect.*\} from [\"'']react[\"'']') {
        # Remove any plain React imports
        $content = $content -replace 'import React from\s*["'']react["''];?\r?\n', ''
        # Add standardized import at the top
        $content = "import React, { useState, useEffect } from 'react';`r`n" + $content
    }

    # Save file back
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}

Write-Host "✅ All .tsx files now use standardized React imports (React, { useState, useEffect })."
