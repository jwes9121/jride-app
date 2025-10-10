'use client';
import * as React from 'react';

export type BottomNavigationProps = {
  /** The currently active tab key */
  activeTab: string;
  /** React state setter provided by the parent */
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  /** Optional list of tabs to render (keys/labels) */
  tabs?: Array<{ key: string; label?: string }>;
  /** Optional className to style the container */
  className?: string;
};

const DEFAULT_TABS: Array<{ key: string; label?: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'rides', label: 'Rides' },
  { key: 'drivers', label: 'Drivers' },
  { key: 'landmarks', label: 'Landmarks' },
];

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  setActiveTab,
  tabs = DEFAULT_TABS,
  className,
}) => {
  return (
    <nav className={className ?? 'flex gap-2 p-2'}>
      {tabs.map(({ key, label }) => {
        const isActive = key === activeTab;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={[
              'px-3 py-1 rounded text-sm capitalize transition-colors',
              isActive ? 'bg-black text-white' : 'bg-gray-200 text-gray-900 hover:bg-gray-300',
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            {label ?? key}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;
