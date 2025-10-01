"use client";

import { useState } from "react";
import AuthModal from "./AuthModal";

export default function Header() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <header className="flex items-center justify-between p-4 bg-white shadow">
      <h1 className="text-lg font-bold">J-Ride</h1>

      <button onClick={() => setShowAuthModal(true)} className="p-2">
        <i className="ri-user-line text-xl"></i>
      </button>

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={(user) => {
            console.log("Logged in:", user);
            setShowAuthModal(false);
          }}
          mode="signin"
        />
      )}
    </header>
  );
}
