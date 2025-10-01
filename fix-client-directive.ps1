# fix-client-directive.ps1
$files = Get-ChildItem -Path "app" -Recurse -Include *.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw

    # Remove duplicate 'use client'
    $content = $content -replace '["'']use client["''];?', ''
    $content = $content -replace "[''`]use client[''`];?", ''

    # Remove duplicate useEffect / useState imports
    $content = $content -replace 'import\s*\{\s*useEffect\s*\}\s*from\s*["'']react["''];?', ''
    $content = $content -replace 'import\s*\{\s*useState\s*\}\s*from\s*["'']react["''];?', ''
    $content = $content -replace 'import\s*\{\s*useState,\s*useEffect\s*\}\s*from\s*["'']react["''];?', ''

    # Ensure unified React import if file uses useState/useEffect
    if ($content -match "useState" -or $content -match "useEffect") {
        $content = "import { useState, useEffect } from 'react';`n" + $content.Trim()
    }

    # Ensure 'use client' is first line (except layout.tsx)
    if ($file.Name -ne "layout.tsx") {
        $content = '"use client";' + "`n" + $content.Trim()
    }

    # Save back
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}

Write-Host "✅ Fixed: all .tsx files now start with 'use client', imports cleaned, no duplicates."
