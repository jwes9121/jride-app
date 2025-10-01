# fix-use-client.ps1
$files = Get-ChildItem -Path "app" -Recurse -Include *.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw

    # If "use client" exists but is not at the top
    if ($content -match '"use client"') {
        # Remove all existing occurrences
        $content = $content -replace '"use client";\s*', ''

        # Re-add it at the very top
        $content = '"use client";' + "`r`n" + $content
    }

    # Save back to file
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}

Write-Host "✅ All .tsx files fixed: 'use client' moved to the very top."
