# Fix Header usage across all .tsx files
$files = Get-ChildItem -Path "C:\Users\jwes9\Desktop\Jride-app\app" -Recurse -Include *.tsx

foreach ($file in $files) {
    (Get-Content $file.FullName) |
    ForEach-Object {
        $_ -replace '<Header\s*/>', '<Header title="J-Ride" />'
    } | Set-Content $file.FullName
}

Write-Output "✅ All <Header /> tags updated to <Header title='J-Ride' />"
