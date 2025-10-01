# fix-all.ps1
param(
  [string]$Root = "."
)

Write-Host "== Jride-app bulk patch starting ==" -ForegroundColor Cyan
$Root = (Resolve-Path $Root).Path
Write-Host "Root: $Root"

function Read-File($p) {
  try { return [System.IO.File]::ReadAllText($p) } catch { return $null }
}
function Write-File($p, $txt) {
  [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($p)) | Out-Null
  [System.IO.File]::WriteAllText($p, $txt)
}
function Patch-File($path, [ScriptBlock]$transform, $label) {
  if (-not (Test-Path $path)) { return $false }
  $src = Read-File $path
  if (-not $src) { return $false }
  $new = & $transform $src
  if ($new -and $new -ne $src) {
    Write-File $path $new
    Write-Host "  ✓ Patched $label: $path" -ForegroundColor Green
    return $true
  } else {
    Write-Host "  • No change for $label (already ok): $path" -ForegroundColor DarkGray
    return $false
  }
}

# -------- Locate files --------
$header = Get-ChildItem -Path "$Root\components" -Recurse -File -Include Header.tsx,header.tsx | Select-Object -First 1
$bottomNav = Get-ChildItem -Path "$Root\components" -Recurse -File -Include BottomNavigation.tsx,bottomnavigation.tsx | Select-Object -First 1
$verifBadge = Get-ChildItem -Path "$Root\components" -Recurse -File -Include VerificationStatusBadge.tsx,verificationstatusbadge.tsx | Select-Object -First 1

if (-not $header)     { Write-Host "  ! Header.tsx not found under /components (skipping)" -ForegroundColor Yellow }
if (-not $bottomNav)  { Write-Host "  ! BottomNavigation.tsx not found under /components (skipping)" -ForegroundColor Yellow }
if (-not $verifBadge) { Write-Host "  ! VerificationStatusBadge.tsx not found under /components (skipping)" -ForegroundColor Yellow }

# -------- Patch Header.tsx --------
if ($header) {
  Patch-File $header.FullName {
    param($src)
    $s = $src

    # Ensure HeaderProps interface exists with our fields
    if ($s -notmatch "interface\s+HeaderProps") {
      $s = $s -replace "(export\s+default\s+function\s+Header\()", "export interface HeaderProps {`n  title?: string;`n  showBack?: boolean;`n  showBackButton?: boolean;`n  onBack?: () => void;`n  showProfile?: boolean;`n}`n`n`$1"
    } else {
      $s = [regex]::Replace($s,
        "interface\s+HeaderProps\s*\{[^}]*\}",
        "interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  showProfile?: boolean;
}", "Singleline")
    }

    # Normalize component signature to use HeaderProps and defaults
    $s = [regex]::Replace($s,
      "const\s+Header\s*:\s*React\.FC<[^>]*>\s*=\s*\([^\)]*\)",
      "const Header: React.FC<HeaderProps> = ({ title = 'J-Ride', showBack = false, showBackButton = false, onBack, showProfile = false })")

    $s = [regex]::Replace($s,
      "export\s+default\s+function\s+Header\s*\([^\)]*\)",
      "export default function Header({ title = 'J-Ride', showBack = false, showBackButton = false, onBack, showProfile = false }: HeaderProps)")

    # Back-compat: treat showBackButton like showBack
    $s = $s -replace "showBackButton\s*&&", "(showBack || showBackButton) &&"

    # Normalize onBackClick -> onBack if present
    $s = $s -replace "onBackClick", "onBack"

    # Ensure default export exists (best-effort)
    if ($s -notmatch "export\s+default\s+Header") {
      $s = $s.TrimEnd() + "`nexport default Header`n"
    }

    return $s
  } "Header"
}

# -------- Patch VerificationStatusBadge.tsx --------
if ($verifBadge) {
  Patch-File $verifBadge.FullName {
    param($src)
    $s = $src

    # Interface with expanded status + optional onClick & size
    if ($s -match "interface\s+VerificationStatusBadgeProps") {
      $s = [regex]::Replace($s,
        "interface\s+VerificationStatusBadgeProps\s*\{[^}]*\}",
        "interface VerificationStatusBadgeProps {
  status: 'verified' | 'unverified' | 'pending' | 'rejected';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}", "Singleline")
    } else {
      $s = "interface VerificationStatusBadgeProps {
  status: 'verified' | 'unverified' | 'pending' | 'rejected';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}
" + $s
    }

    # Normalize function signature
    $s = [regex]::Replace($s,
      "function\s+VerificationStatusBadge\s*\([^\)]*\)",
      "function VerificationStatusBadge({ status, size = 'sm', onClick }: VerificationStatusBadgeProps)")

    $s = [regex]::Replace($s,
      "const\s+VerificationStatusBadge\s*:\s*React\.FC<[^>]*>\s*=\s*\([^\)]*\)",
      "const VerificationStatusBadge: React.FC<VerificationStatusBadgeProps> = ({ status, size = 'sm', onClick })")

    # Make root clickable if onClick provided (best-effort)
    if ($s -notmatch "onClick") {
      # Can't robustly inject without JSX context; skip if no match
    } else {
      # Add role/button/tabIndex on existing clickable wrapper if easy to spot
      $s = $s -replace "(\<div[^>]*)(\>)", '$1 role={onClick ? "button" : undefined} onClick={onClick} tabIndex={onClick ? 0 : undefined}$2', 1
    }

    return $s
  } "VerificationStatusBadge"
}

# -------- Patch BottomNavigation.tsx --------
if ($bottomNav) {
  Patch-File $bottomNav.FullName {
    param($src)
    $s = $src

    # Interface with optional props
    if ($s -match "interface\s+BottomNavigationProps") {
      $s = [regex]::Replace($s,
        "interface\s+BottomNavigationProps\s*\{[^}]*\}",
        "interface BottomNavigationProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}", "Singleline")
    } else {
      $s = "interface BottomNavigationProps { activeTab?: string; setActiveTab?: (tab: string) => void; }
" + $s
    }

    # Normalize signature
    $s = [regex]::Replace($s,
      "const\s+BottomNavigation\s*:\s*React\.FC<[^>]*>\s*=\s*\([^\)]*\)",
      "const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, setActiveTab })")

    $s = [regex]::Replace($s,
      "export\s+default\s+function\s+BottomNavigation\s*\([^\)]*\)",
      "export default function BottomNavigation({ activeTab, setActiveTab }: BottomNavigationProps)")

    # Inject uncontrolled fallback (only once)
    if ($s -notmatch "const\s*\[\s*internalTab") {
      $inject = @"
const [internalTab, setInternalTab] = React.useState<string>(activeTab || 'home');
const currentTab = (typeof activeTab === 'string') ? activeTab : internalTab;
const changeTab = (t: string) => { if (setActiveTab) setActiveTab(t); else setInternalTab(t); };
"@
      $s = $s -replace "(BottomNavigation\s*\{)", ("`$1`n" + $inject)
    }

    # Replace internal references (best-effort)
    $s = $s -replace "\bactiveTab\b", "currentTab"
    $s = $s -replace "setActiveTab\s*\(", "changeTab("

    return $s
  } "BottomNavigation"
}

# -------- Update package.json with dev deps --------
$pkg = Join-Path $Root "package.json"
if (Test-Path $pkg) {
  $json = Get-Content $pkg -Raw | ConvertFrom-Json
  if (-not $json.dependencies)   { $json | Add-Member -NotePropertyName dependencies   -NotePropertyValue (@{}) }
  if (-not $json.devDependencies){ $json | Add-Member -NotePropertyName devDependencies -NotePropertyValue (@{}) }
  if (-not $json.scripts)        { $json | Add-Member -NotePropertyName scripts        -NotePropertyValue (@{}) }

  $json.dependencies.next        = $json.dependencies.next        ?: "14.2.33"
  $json.dependencies.react       = $json.dependencies.react       ?: "^18.3.1"
  $json.dependencies."react-dom" = $json.dependencies."react-dom" ?: "^18.3.1"
  $json.devDependencies.autoprefixer = $json.devDependencies.autoprefixer ?: "^10.4.20"
  $json.devDependencies.postcss      = $json.devDependencies.postcss      ?: "^8.4.31"
  $json.devDependencies.tailwindcss  = $json.devDependencies.tailwindcss  ?: "^3.4.10"

  if (-not $json.scripts.dev)    { $json.scripts.dev    = "next dev" }
  if (-not $json.scripts.build)  { $json.scripts.build  = "next build" }
  if (-not $json.scripts.start)  { $json.scripts.start  = "next start" }

  ($json | ConvertTo-Json -Depth 100) | Set-Content $pkg -Encoding UTF8
  Write-Host "  ✓ package.json ensured (deps/scripts)" -ForegroundColor Green
} else {
  Write-Host "  ! package.json not found (skipping deps check)" -ForegroundColor Yellow
}

Write-Host "== Done. Now run =="
Write-Host "   npm install" -ForegroundColor Cyan
Write-Host "   npm run build" -ForegroundColor Cyan
