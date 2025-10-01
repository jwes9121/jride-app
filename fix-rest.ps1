# Fix components to spread ...rest into root JSX element
Get-ChildItem -Path .\components -Recurse -Include *.tsx | ForEach-Object {
    $content = Get-Content $_.FullName -Raw

    # Add ...rest if it's not already there
    if ($content -match '<(div|header|section)[^>]*>') {
        $newContent = $content -replace '(<(div|header|section)([^>]*))>', '$1 {...rest}>'

        if ($newContent -ne $content) {
            Write-Host "✅ Updated: $($_.FullName)"
            Set-Content $_.FullName $newContent
        } else {
            Write-Host "⚠️ Skipped (already has ...rest): $($_.FullName)"
        }
    }
}
