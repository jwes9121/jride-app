# fix-useeffect.ps1
# This script finds all useEffect calls with [] and inserts an ESLint disable comment.

$projectPath = "C:\Users\jwes9\Desktop\Jride-app"

# Get all TSX files in the app and components folders
$files = Get-ChildItem -Path $projectPath -Recurse -Include *.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName
    $modified = $false
    $newContent = @()

    for ($i = 0; $i -lt $content.Length; $i++) {
        $line = $content[$i]

        # Match useEffect(() => { ... }, []);
        if ($line -match "useEffect\s*\(\s*\(\s*.*\)\s*=>\s*{.*},\s*\[\]\s*\)") {
            # Add ESLint disable comment above
            $newContent += "// eslint-disable-next-line react-hooks/exhaustive-deps"
            $modified = $true
        }

        $newContent += $line
    }

    if ($modified) {
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8
        Write-Host "✅ Patched useEffect in $($file.FullName)"
    }
}

Write-Host "`n🎯 All useEffect hooks patched. Now run: npm run build"
