"use client";

import { useSession, signOut } from "next-auth/react";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p className="p-4">Loading...</p>;
  }

  if (!session) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Not logged in</h2>
        <p className="text-gray-600">Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Your Profile</h2>

        {session.user?.image && (
          <img
            src={session.user.image}
            alt="Profile picture"
            className="mx-auto mb-4 w-24 h-24 rounded-full border"
          />
        )}

        <p className="text-lg font-medium">{session.user?.name}</p>
        <p className="text-gray-600">{session.user?.email}</p>

        <button
          onClick={() => signOut()}
          className="mt-6 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
