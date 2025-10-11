  "use client";

import React from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const handleSignIn = async () => {
    await signIn("google"); // or your provider id
  };

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Sign in</h1>
      <button
        className="rounded-md border px-3 py-2 text-sm"
        onClick={handleSignIn}
      >
        Sign in with Google
      </button>
    </div>
  );
}
