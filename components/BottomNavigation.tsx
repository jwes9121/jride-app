import React, { Dispatch, SetStateAction } from "react";
import Link from "next/link";

export interface BottomNavigationProps {
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
}

export default function BottomNavigation({
  activeTab,
  setActiveTab,
}: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-md border-t flex justify-around items-center h-16 z-50">
      <Link
        href="/"
        onClick={() => setActiveTab("home")}
        className={`flex flex-col items-center ${
          activeTab === "home" ? "text-blue-600" : "text-gray-500"
        }`}
      >
        <i className="ri-home-line text-xl"></i>
        <span className="text-xs">Home</span>
      </Link>

      <Link
        href="/history"
        onClick={() => setActiveTab("history")}
        className={`flex flex-col items-center ${
          activeTab === "history" ? "text-blue-600" : "text-gray-500"
        }`}
      >
        <i className="ri-time-line text-xl"></i>
        <span className="text-xs">History</span>
      </Link>

      <Link
        href="/profile"
        onClick={() => setActiveTab("profile")}
        className={`flex flex-col items-center ${
          activeTab === "profile" ? "text-blue-600" : "text-gray-500"
        }`}
      >
        <i className="ri-user-line text-xl"></i>
        <span className="text-xs">Profile</span>
      </Link>
    </nav>
  );
}
