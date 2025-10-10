"use client";

import React, { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  Package,
  ShoppingBag,
  MapPin,
  User,
} from "lucide-react";

interface TabItem {
  key: string;
  label: string;
}

interface BottomNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
  town?: string;
}

export default function BottomNavigation({
  tabs,
  activeTab,
  setActiveTab,
  town = "Lagawe",
}: BottomNavigationProps) {
  const router = useRouter();

  // Town color mapping
  const townColors: Record<string, string> = {
    Lagawe: "text-[#800000]", // maroon
    Kiangan: "text-[#008000]", // green
    Banaue: "text-[#0066cc]", // blue
    Lamut: "text-[#ff6600]", // orange
    Hingyon: "text-[#800080]", // purple
  };

  const activeColor = townColors[town] || "text-blue-600";

  // Icon mapping
  const icons: Record<string, JSX.Element> = {
    rides: <Home size={22} />,
    delivery: <Package size={22} />,
    errands: <ShoppingBag size={22} />,
    map: <MapPin size={22} />,
    profile: <User size={22} />,
  };

  // Handle tab click
  const handleTabClick = (tab: TabItem) => {
    setActiveTab(tab.label);

    // Navigate to page if it exists
    const path = `/${tab.key}`;
    router.push(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-md flex justify-around py-2 z-50">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => handleTabClick(tab)}
          className={`flex flex-col items-center text-xs font-medium transition-colors duration-150 ${
            activeTab === tab.label
              ? `${activeColor}`
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {icons[tab.key] ?? <Home size={22} />}
          <span className="mt-1">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
