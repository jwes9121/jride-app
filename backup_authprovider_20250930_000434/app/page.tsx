"use client";

import { useAuth } from "@/hooks/useAuth";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-4">Welcome to J-Ride</h1>

      {!user ? (
        <p className="text-gray-600">Please log in using the profile icon above to continue.</p>
      ) : (
        <div>
          <p className="mb-4">Hello, {user.email}</p>
          <ul className="space-y-3">
            <li className="p-4 bg-white shadow rounded-xl">🚖 Book a Ride</li>
            <li className="p-4 bg-white shadow rounded-xl">🍔 Order Food</li>
            <li className="p-4 bg-white shadow rounded-xl">📦 Send a Package</li>
          </ul>
        </div>
      )}
    </div>
  );
}
