"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
  mode: "signin" | "signup";
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess, mode }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async () => {
    try {
      setLoading(true);

      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthSuccess(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        onAuthSuccess(data.user);
      }

      onClose();
    } catch (err) {
      console.error("Auth error:", err);
      alert("Authentication failed: " + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) throw error;
      console.log("Redirecting to Google OAuth:", data.url);
      // Supabase will redirect automatically to the configured callback URL
    } catch (err) {
      console.error("Google Auth error:", err);
      alert("Google sign-in failed: " + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">
          {mode === "signin" ? "Sign In" : "Sign Up"}
        </h2>

        {/* Email/Password Form */}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full border p-3 rounded-lg mb-3"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border p-3 rounded-lg mb-4"
        />

        <button
          onClick={handleAuth}
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {loading ? "Processing..." : mode === "signin" ? "Sign In" : "Sign Up"}
        </button>

        {/* Divider */}
        <div className="my-4 text-center text-gray-500">or</div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center gap-2"
        >
          <i className="ri-google-fill text-lg"></i>
          Continue with Google
        </button>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full py-2 mt-3 text-gray-600 hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
