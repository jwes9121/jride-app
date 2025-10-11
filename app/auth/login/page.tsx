"use client";

import React, { useCallback } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const handleLogin = useCallback(async () => {
    await signIn("google"); // use your provider id if different
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Log in</h1>
      <button
        className="rounded-md border px-3 py-2 text-sm"
        onClick={handleLogin}
      >
        Continue with Google
      </button>
    </div>
  );
}
