"use client"

import { getProviders, signIn } from "next-auth/react"

export default async function SignInPage() {
  const providers = await getProviders()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Sign in to J-Ride</h1>
      {providers &&
        Object.values(providers).map((provider) => (
          <button
            key={provider.id}
            onClick={() => signIn(provider.id)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign in with {provider.name}
          </button>
        ))}
    </div>
  )
}
