"use client";

import React, { Dispatch, SetStateAction } from "react";
import {
  Home,
  Package,
  ShoppingBag,
  MapPin,
  User,
} from "lucide-react";

interface BottomNavigationProps {
  tabs: string[];
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
  town?: string; // optional: for dynamic color theming (e.g., Lagawe, Kiangan)
}

export default function BottomNavigation({
  tabs,
  activeTab,
  setActiveTab,
  town = "Lagawe", // default
}: BottomNavigationProps) {
  // Town color legend
  const townColors: Record<string, string> = {
    Lagawe: "text-[#800000]", // maroon
    Kiangan: "text-[#008000]", // green
    Banaue: "text-[#0066cc]", // blue
    Lamut: "text-[#ff6600]", // orange
    Hingyon: "text-[#800080]", // purple
  };

  const activeColor = townColors[town] || "text-blue-600";

  const icons: Record<string, JSX.Element> = {
    Rides: <Home size={22} />,
    Deliveries: <Package size={22} />,
    Errands: <ShoppingBag size={22} />,
    Map: <MapPin size={22} />,
    Profile: <User size={22} />,
  };

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-md flex justify-around py-2 z-50">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`flex flex-col items-center text-xs font-medium transition-colors duration-150 ${
            activeTab === tab
              ? `${activeColor}`
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {icons[tab] ?? <Home size={22} />}
          <span className="mt-1">{tab}</span>
        </button>
      ))}
    </nav>
  );
}
