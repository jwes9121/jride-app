# ============================================
# 🔧 Jride Auto Fix Script
# Fixes missing core files and path alias
# ============================================

Write-Host "🔄 Running Jride auto-fix..."

# Step 1: Ensure package.json exists
if (-not (Test-Path "package.json")) {
@"
{
  "name": "j-ride-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
"@ | Out-File "package.json" -Encoding UTF8
Write-Host "✅ package.json created"
}

# Step 2: Ensure tsconfig.json has correct alias
$tsconfig = @"
{
  "compilerOptions": {
    "target": "esnext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
"@

$tsconfig | Out-File "tsconfig.json" -Encoding UTF8
Write-Host "✅ tsconfig.json patched with alias"

# Step 3: Ensure vercel.json exists
if (-not (Test-Path "vercel.json")) {
@"
{
  "version": 2,
  "builds": [
    { "src": "next.config.js", "use": "@vercel/next" }
  ]
}
"@ | Out-File "vercel.json" -Encoding UTF8
Write-Host "✅ vercel.json created"
}

Write-Host "🎉 Core config files patched successfully!"
