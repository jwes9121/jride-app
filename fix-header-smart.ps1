# File: fix-header-smart.ps1
# Purpose: Replace <Header /> with <Header title="X Dashboard" /> automatically

$root = "C:\Users\jwes9\Desktop\Jride-app"

Get-ChildItem -Path $root -Recurse -Include *.tsx | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw

    if ($content -match "<Header\s*/>") {
        # Get the folder name 2 levels above (e.g., app\dispatcher\page.tsx → dispatcher)
        $folder = Split-Path (Split-Path $file -Parent) -Leaf

        # Capitalize first letter
        $title = ($folder.Substring(0,1).ToUpper() + $folder.Substring(1))

        # Handle special cases
        switch -Regex ($folder) {
            "driver"       { $title = "Driver Dashboard" }
            "dispatcher"   { $title = "Dispatcher Dashboard" }
            "errand"       { $title = "Errand Dashboard" }
            "payouts"      { $title = "Driver Payouts" }
            "verification" { $title = "User Verification" }
            default        { $title = "$title Page" }
        }

        # Replace
        $newContent = $content -replace "<Header\s*/>", "<Header title=`"$title`" />"

        Set-Content -Path $file -Value $newContent -Encoding UTF8
        Write-Host "✅ Fixed Header in $file → $title"
    }
}
