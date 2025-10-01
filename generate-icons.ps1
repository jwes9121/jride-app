# J-Ride PWA Icon Generator
# Place this file in your project root: C:\Users\jwes9\Desktop\Jride-app
# Run with: powershell -ExecutionPolicy Bypass -File generate-icons.ps1

$ErrorActionPreference = "Stop"

# === 1. Ensure directories exist ===
$iconsPath = ".\public\icons"
if (!(Test-Path ".\public")) {
    New-Item -ItemType Directory -Path ".\public" | Out-Null
}
if (!(Test-Path $iconsPath)) {
    New-Item -ItemType Directory -Path $iconsPath | Out-Null
}

Write-Host "✅ Directories checked/created"

# === 2. Base64 string for your J-Ride logo (placeholder until replaced) ===
# 👉 Replace this with the real Base64 string of your blue/green J-Ride logo PNG
$pngBase64 = "<PUT-YOUR-LOGO-BASE64-HERE>"

# === 3. Generate icons ===
[IO.File]::WriteAllBytes("$iconsPath\icon-192.png", [Convert]::FromBase64String($pngBase64))
[IO.File]::WriteAllBytes("$iconsPath\icon-512.png", [Convert]::FromBase64String($pngBase64))
[IO.File]::WriteAllBytes("$iconsPath\maskable-192.png", [Convert]::FromBase64String($pngBase64))
[IO.File]::WriteAllBytes("$iconsPath\maskable-512.png", [Convert]::FromBase64String($pngBase64))

Write-Host "🎉 All PWA icons generated successfully at $iconsPath"
