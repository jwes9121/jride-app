# fix-jride-final.ps1
# Apply critical fixes to J-Ride app and rebuild

Write-Host "🔧 Starting J-Ride fixes..."

# 1. Fix next.config.js (remove experimental.appDir)
$nextConfigPath = "next.config.js"
if (Test-Path $nextConfigPath) {
  Write-Host "⚙️  Patching next.config.js..."
@'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true
};

module.exports = nextConfig;
'@ | Out-File $nextConfigPath -Encoding UTF8
}

# 2. Fix app/ride/page.tsx
$ridePagePath = "app/ride/page.tsx"
if (Test-Path $ridePagePath) {
  Write-Host "⚙️  Patching app/ride/page.tsx..."
@'
'use client';

import { useState } from 'react';
import BottomNavigation from '@/components/BottomNavigation';
import AuthModal from '@/components/AuthModal';

export default function RidePage() {
  const [activeTab, setActiveTab] = useState('ride');
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-4">
        <h1 className="text-2xl font-bold">Book a Ride</h1>
        <p className="text-gray-600 mt-2">Choose your ride option below.</p>
        {/* Your booking form or ride options go here */}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}
'@ | Out-File $ridePagePath -Encoding UTF8
}

# 3. Clean Next.js build cache
Write-Host "🧹 Cleaning .next/ cache..."
if (Test-Path ".next") {
  Remove-Item ".next" -Recurse -Force
}

# 4. Install dependencies and rebuild
Write-Host "📦 Installing dependencies..."
npm install

Write-Host "🏗️ Building project..."
npm run build

# 5. Start dev server automatically
Write-Host "🚀 Starting dev server..."
npm run dev
