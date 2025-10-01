# fix-duplicate-react-imports.ps1
$files = Get-ChildItem -Path "app" -Recurse -Include *.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw

    # If both imports exist, keep only the React one
    if ($content -match 'import { useState, useEffect } from .react.' -and
        $content -match 'import React, { useState, useEffect } from .react.') {

        # Remove the first shorter import
        $content = $content -replace 'import\s*\{\s*useState\s*,\s*useEffect\s*\}\s*from\s*["'']react["''];?\r?\n', ''
    }

    # Save cleaned file
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}

Write-Host "✅ Duplicate React hook imports fixed across all .tsx files."
