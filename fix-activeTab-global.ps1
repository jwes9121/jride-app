# Fix duplicate state hooks across all page.tsx files
$files = Get-ChildItem -Recurse -Filter "page.tsx"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw

    # Remove duplicate showAuthModal definitions
    $content = $content -replace '(?s)const\s*\[\s*showAuthModal\s*,\s*setShowAuthModal\s*\]\s*=\s*useState\(false\);\s*const\s*\[\s*showAuthModal\s*,\s*setShowAuthModal\s*\]\s*=\s*useState\(false\);', 'const [showAuthModal, setShowAuthModal] = useState(false);'

    # Remove duplicate activeTab definitions
    $content = $content -replace '(?s)const\s*\[\s*activeTab\s*,\s*setActiveTab\s*\]\s*=\s*useState\(\'home\'\);\s*const\s*\[\s*activeTab\s*,\s*setActiveTab\s*\]\s*=\s*useState\(\'home\'\);', 'const [activeTab, setActiveTab] = useState(\'home\');'

    # Save back the cleaned file
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}

Write-Host "✅ Duplicate state hooks cleaned across all page.tsx files!"
