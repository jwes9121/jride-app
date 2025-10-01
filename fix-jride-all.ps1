# fix-jride-all.ps1
# One-shot sweep to unify props across all .tsx files

Get-ChildItem -Path . -Recurse -Include *.tsx | ForEach-Object {
  (Get-Content $_.FullName) `
    -replace 'showBackButton', 'showBack' `
    -replace 'onBackClick', 'onBack' `
    -replace 'showProfile={true}', 'showProfile={true} title="Profile"' `
    | Set-Content $_.FullName
}

Write-Host "✅ Global sweep complete! Props unified across all .tsx files."
