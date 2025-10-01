"use client";

import React, { useState } from "react";
import BottomNavigation from "@/components/BottomNavigation";
import AuthModal from "@/components/AuthModal";

export default function DriverPayoutsPage() {
  const [activeTab, setActiveTab] = useState("payouts");
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div>
      <h1 className="text-xl font-bold p-4">Driver Payouts</h1>

      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={() => setShowAuthModal(false)}
          mode="signin"
        />
      )}
    </div>
  );
}
