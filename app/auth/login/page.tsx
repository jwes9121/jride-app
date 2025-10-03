'use client';

import { useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const handleLogin = useCallback(async () => {
    await signIn("google");
  }, []);

  useEffect(() => {
    handleLogin();
  }, [handleLogin]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Logging in...</h1>
    </div>
  );
}

