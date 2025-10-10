"use client";

import React, { useState } from "react";
import BottomNavigation from "@/components/BottomNavigation";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("Admin");
  const town = "Lagawe"; // dynamic later via Supabase user table

  // Define object-based tabs for routing
  const TABS = [
    { key: "rides", label: "Rides" },
    { key: "delivery", label: "Deliveries" },
    { key: "errands", label: "Errands" },
    { key: "map", label: "Map" },
    { key: "profile", label: "Profile" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 p-4 pb-16">
        <h1 className="text-xl font-semibold mb-4 text-gray-800">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Manage trips, drivers, and deliveries for {town}.
        </p>
      </main>

      <BottomNavigation
        tabs={TABS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        town={town}
      />
    </div>
  );
}
