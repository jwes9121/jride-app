# fix-unescaped-entities.ps1
# This script replaces unescaped ' and " inside JSX text with HTML entities.

$projectPath = "C:\Users\jwes9\Desktop\Jride-app"

# Get all TSX files
$files = Get-ChildItem -Path $projectPath -Recurse -Include *.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content

    # Replace raw apostrophes with &apos;
    $content = $content -replace "(?<=\>)'(?=[^<])", "&apos;"
    $content = $content -replace "(?<=\s)'(?=\s)", "&apos;"

    # Replace raw quotes with &quot;
    $content = $content -replace "(?<=\>)""(?=[^<])", "&quot;"
    $content = $content -replace "(?<=\s)""(?=\s)", "&quot;"

    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "✅ Fixed unescaped entities in $($file.FullName)"
    }
}

Write-Host "`n🎯 All unescaped entities replaced. Now run: npm run build"
