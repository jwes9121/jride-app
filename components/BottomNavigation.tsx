// components/BottomNavigation.tsx
'use client';
import * as React from 'react';

type BottomNavigationProps = {
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  // Optional: allow caller to pass custom tabs
  tabs?: string[];
};

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  setActiveTab,
  tabs = ['overview', 'rides', 'drivers', 'landmarks'], // default list – adjust to your app
}) => {
  return (
    <nav className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`px-3 py-1 rounded ${
            activeTab === tab ? 'bg-black text-white' : 'bg-gray-200'
          }`}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
};

export default BottomNavigation;
