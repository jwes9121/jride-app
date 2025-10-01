"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import AuthModal from "@/components/AuthModal";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallbackPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setShowAuthModal(true);
      } else {
        router.push("/");
      }
    };
    handleAuth();
  }, [router]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Authentication Callback</h1>

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={() => router.push("/")}
          mode="signin"
        />
      )}
    </div>
  );
}
