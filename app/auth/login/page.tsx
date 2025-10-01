"use client";

import { useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  const supabase = createClientComponentClient();

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`, // 👈 must match Supabase + Google settings
        },
      });

      if (error) {
        console.error("Login error:", error);
        alert("Login failed: " + error.message);
      }
    } catch (err) {
      console.error("Unexpected login error:", err);
      alert("Unexpected login error");
    }
  };

  useEffect(() => {
    // auto-trigger login when page is opened
    handleLogin();
  }, []);

  return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-lg">Redirecting to Google login...</p>
    </div>
  );
}
