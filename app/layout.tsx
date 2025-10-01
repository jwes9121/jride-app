"use client";

import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import LoginButton from "@/components/LoginButton";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {/* Top Navigation Bar */}
          <header className="flex justify-between items-center p-4 bg-white shadow">
            <h1 className="font-bold text-lg">J-Ride</h1>
            <LoginButton />
          </header>

          {/* Main Content */}
          <main className="p-4">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}



