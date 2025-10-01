"use client";

import React, { useState, useEffect } from "react";
import AuthModal from "@/components/AuthModal";

export default function RidePage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with Supabase auth check
    const fakeUser = null;
    if (!fakeUser) {
      setShowAuthModal(true);
    } else {
      setUser(fakeUser);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <p className="p-4">Loading...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-4">
        <h1 className="text-xl font-bold">Ride Page</h1>
      </main>

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={(data) => {
            setUser(data);
            setShowAuthModal(false);
          }}
          mode="signin"
        />
      )}
    </div>
  );
}
