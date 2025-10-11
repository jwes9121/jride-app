"use client";

import React from "react";

export type AuthMode = "signin" | "signup";

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: AuthMode;
  /** Optional callback fired when auth completes successfully */
  onAuthSuccess?: () => void;      // 👈 add this
}

export default function AuthModal({
  isOpen,
  onClose,
  mode = "signin",
  onAuthSuccess,                   // 👈 accept it
}: AuthModalProps) {
  if (!isOpen) return null;

  const handleSuccess = () => {
    // ... your success logic (e.g., set session, redirect, etc.)
    onAuthSuccess?.();             // 👈 call if provided
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 grid place-items-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h2>

        {/* your auth form goes here */}
        {/* on successful auth, call handleSuccess() */}
        <button className="mt-4 w-full rounded-md border px-3 py-2" onClick={handleSuccess}>
          Continue
        </button>

        <button className="mt-2 w-full text-sm text-gray-500" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
