# Fix AuthModal usages and enforce "use client" directive at top of files
Write-Host "🔧 Starting AuthModal + use client fixes..."

$folders = @("app", "components")

foreach ($folder in $folders) {
    $files = Get-ChildItem -Path $folder -Recurse -Include *.tsx -ErrorAction SilentlyContinue

    foreach ($file in $files) {
        Write-Host "📄 Processing $($file.FullName)..."

        $content = Get-Content $file.FullName -Raw

        # --- Fix AuthModal props ---
        $content = $content -replace 'open\s*=\s*{[^}]+}', ''
        $content = $content -replace 'showAuthModal\s*=\s*{[^}]+}', ''
        $content = $content -replace 'isOpen\s*=\s*{[^}]+}', ''
        $content = $content -replace 'onAuthSuccess\s*=\s*{[^}]+}', ''
        $content = $content -replace 'mode\s*=\s*"[^"]*"', ''

        # Replace bare <AuthModal with safe props
        $content = $content -replace '<AuthModal(\s*)>', '<AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onAuthSuccess={() => {}} mode="signin" />'

        # --- Enforce "use client" directive at very top ---
        $content = $content -replace "['""]use client['""];\s*", ""
        $content = $content -replace "use client;\s*", ""

        if ($content -notmatch "use client") {
            $content = "'use client';`r`n" + $content
        }

        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
    }
}

Write-Host "✅ All fixes applied! Now run: npm run build"
