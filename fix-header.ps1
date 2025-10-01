# fix-header.ps1
# This script finds all <Header /> usages without props
# and replaces them with <Header title="Page Title" />

Get-ChildItem -Path . -Recurse -Include *.tsx | ForEach-Object {
    $content = Get-Content $_.FullName -Raw

    # Regex looks for <Header /> with optional spaces/self-closing
    $newContent = $content -replace '<Header\s*/>', '<Header title="Page Title" />'

    if ($newContent -ne $content) {
        Write-Host "Fixed:" $_.FullName -ForegroundColor Green
        Set-Content -Path $_.FullName -Value $newContent -Encoding UTF8
    }
}
