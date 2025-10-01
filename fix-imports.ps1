# fix-imports.ps1
$files = Get-ChildItem -Path "app" -Recurse -Include *.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw

    # Ensure "use client";
    if ($content -notmatch '"use client";') {
        $content = '"use client";' + "`n`n" + $content
    }

    # Add React hooks import if missing
    if ($content -match "useState" -and $content -notmatch "import { useState") {
        $content = "import { useState } from `"react`";`n" + $content
    }
    if ($content -match "useEffect" -and $content -notmatch "import { useEffect") {
        $content = "import { useEffect } from `"react`";`n" + $content
    }

    # Add next/router import if missing
    if ($content -match "useRouter" -and $content -notmatch "import { useRouter") {
        $content = "import { useRouter } from `"next/navigation`";`n" + $content
    }

    # Save updated content
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}

Write-Host "✅ Global imports fix applied to all page.tsx files!"
