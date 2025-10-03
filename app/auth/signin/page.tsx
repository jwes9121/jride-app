'use client';

import { signIn } from 'next-auth/react';

export default function SignInPage() {
  const handleSignIn = async () => {
    await signIn('google');
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Sign In</h1>
      <button
        onClick={handleSignIn}
        className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
      >
        Sign in with Google
      </button>
    </div>
  );
}
