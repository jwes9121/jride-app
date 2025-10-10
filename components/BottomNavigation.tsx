'use client';

import React, { useMemo } from 'react';

type TabItem = string | { key: string; label: string };

type BottomNavigationProps = {
  /** Tabs can be simple strings or { key, label } objects */
  tabs: TabItem[];
  /** Currently active tab key */
  activeTab: string;
  /** Setter to change active tab */
  setActiveTab: (key: string) => void;
  className?: string;
};

export default function BottomNavigation({
  tabs,
  activeTab,
  setActiveTab,
  className,
}: BottomNavigationProps) {
  // normalize to objects: { key, label }
  const items = useMemo(
    () =>
      tabs.map((t) =>
        typeof t === 'string' ? { key: t, label: t } : t
      ),
    [tabs]
  );

  return (
    <nav className={className}>
      <ul className="flex gap-2">
        {items.map((t) => (
          <li key={t.key}>
            <button
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1 rounded ${
                activeTab === t.key
                  ? 'bg-black text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
