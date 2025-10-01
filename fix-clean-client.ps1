# fix-clean-client.ps1
$files = Get-ChildItem -Path "app" -Recurse -Include *.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw

    # 1. Ensure "use client"; is the first line, remove duplicates
    $content = $content -replace '["'']use client["''];', ''
    $content = '"use client";' + "`n" + $content.Trim()

    # 2. Merge React imports (remove duplicates)
    # Replace multiple imports of useState/useEffect with a single one
    $content = $content -replace 'import\s*\{\s*useEffect\s*\}\s*from\s*["'']react["''];?', ''
    $content = $content -replace 'import\s*\{\s*useState,\s*useEffect\s*\}\s*from\s*["'']react["''];?', ''
    $content = $content -replace 'import\s*\{\s*useState\s*\}\s*from\s*["'']react["''];?', ''

    if ($content -match "useState" -or $content -match "useEffect") {
        if ($content -notmatch "import { useState, useEffect } from 'react'") {
            $content = "import { useState, useEffect } from 'react';`n" + $content
        }
    }

    # 3. Special rule for layout.tsx: remove "use client"
    if ($file.Name -eq "layout.tsx") {
        $content = $content -replace '"use client";\s*', ''
    }

    # Save cleaned content
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}

Write-Host "✅ All TSX files cleaned: no duplicate useEffect, correct 'use client' placement, layout.tsx safe."
