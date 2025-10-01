"use client";

import React, { useState, useEffect } from "react";
import BottomNavigation from "@/components/BottomNavigation";
import AuthModal from "@/components/AuthModal";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Example: only allow signed-in admins
    const isAdmin = true; // TODO: replace with real auth check
    if (!isAdmin) setShowAuthModal(true);
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold p-4">Admin Dashboard</h1>

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
