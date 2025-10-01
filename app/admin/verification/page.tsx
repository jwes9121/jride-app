"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import AuthModal from "@/components/AuthModal";

export default function VerificationPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div>
      <Header title="User Verification" />

      <button
        onClick={() => setShowAuthModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg mt-4"
      >
        Open Auth
      </button>

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
