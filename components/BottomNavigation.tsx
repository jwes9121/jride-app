"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Home, Package, ShoppingBag, MapPin, User } from "lucide-react";

// Accept BOTH formats: ["Rides", ...] OR [{ key:"delivery", label:"Deliveries" }, ...]
type TabItem = { key: string; label: string };
type TabsProp = Array<string | TabItem>;

interface BottomNavigationProps {
  tabs: TabsProp;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  town?: string;
}

export default function BottomNavigation({
  tabs,
  activeTab,
  setActiveTab,
  town = "Lagawe",
}: BottomNavigationProps) {
  const router = useRouter();

  // normalize to objects so callers can pass strings OR objects
  const normalized: TabItem[] = tabs.map((t) => {
    if (typeof t === "string") {
      const key = t.trim().toLowerCase().replace(/\s+/g, "");
      return { key, label: t };
    }
    // ensure key is a safe path segment
    return {
      key: t.key.trim().toLowerCase().replace(/\s+/g, ""),
      label: t.label,
    };
  });

  const townColors: Record<string, string> = {
    Lagawe: "text-[#800000]",
    Kiangan: "text-[#008000]",
    Banaue: "text-[#0066cc]",
    Lamut: "text-[#ff6600]",
    Hingyon: "text-[#800080]",
  };
  const activeColor = townColors[town] || "text-blue-600";

  const icons: Record<string, JSX.Element> = {
    rides: <Home size={22} />,
    delivery: <Package size={22} />,
    deliveries: <Package size={22} />, // tolerant alias
    errands: <ShoppingBag size={22} />,
    map: <MapPin size={22} />,
    profile: <User size={22} />,
  };

  const handleClick = (tab: TabItem) => {
    setActiveTab(tab.label);
    router.push(`/${tab.key}`);
  };

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-md flex justify-around py-2 z-50">
      {normalized.map((tab) => (
        <button
          key={tab.key}
          onClick={() => handleClick(tab)}
          className={`flex flex-col items-center text-xs font-medium transition-colors duration-150 ${
            activeTab === tab.label ? activeColor : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {icons[tab.key] ?? <Home size={22} />}
          <span className="mt-1">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
