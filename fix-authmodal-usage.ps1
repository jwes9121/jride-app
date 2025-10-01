# fix-authmodal-usage.ps1
$files = Get-ChildItem -Path ".\app" -Recurse -Include *.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw

    # Replace any shorthand usage with the full standardized props
    $content = $content -replace "<AuthModal\s*onClose={[^}]+}\s*/>", @"
<AuthModal
  isOpen={showAuthModal}
  onClose={() => setShowAuthModal(false)}
  onAuthSuccess={(userData) => {
    console.log('Auth success:', userData);
    setShowAuthModal(false);
  }}
  mode="signin"
/>
"@

    # Replace any partial <AuthModal ...> without required props
    $content = $content -replace "<AuthModal\s*([^>]*)>", @"
<AuthModal
  isOpen={showAuthModal}
  onClose={() => setShowAuthModal(false)}
  onAuthSuccess={(userData) => {
    console.log('Auth success:', userData);
    setShowAuthModal(false);
  }}
  mode="signin"
"@
    
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
    Write-Host "✅ Fixed AuthModal usage in $($file.FullName)"
}

Write-Host "`n🎯 All AuthModal components standardized. Now run: npm run build"
