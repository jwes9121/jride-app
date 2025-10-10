"use client";

import React, { useState } from "react";
import BottomNavigation from "@/components/BottomNavigation";

export default function DeliveryPage() {
  const [activeTab, setActiveTab] = useState("Deliveries");

  // Define the tabs shown in the bottom navigation bar
  const tabs = ["Rides", "Deliveries", "Errands", "Map", "Profile"];

  // Active town (this can later be dynamically pulled from Supabase user_town column)
  const town = "Lagawe";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 p-4 pb-16">
        <h1 className="text-xl font-semibold mb-4 text-gray-800">
          Delivery Dashboard
        </h1>
        <p className="text-gray-600">
          Manage and track all delivery activities within {town}.
        </p>
        {/* Add delivery listing, filters, or active delivery cards here */}
      </main>

      <BottomNavigation
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        town={town}
      />
    </div>
  );
}
