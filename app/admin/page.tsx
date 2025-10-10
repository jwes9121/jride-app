'use client';

import React, { useState } from 'react';
import BottomNavigation from '@/components/BottomNavigation';

const TABS: { key: string; label: string }[] = [
  { key: 'overview',  label: 'Overview'  },
  { key: 'rides',     label: 'Rides'     },
  { key: 'drivers',   label: 'Drivers'   },
  { key: 'landmarks', label: 'Landmarks' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<string>('overview');

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Admin Dashboard</h1>

      <BottomNavigation
        tabs={TABS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        className="my-4"
      />

      {/* Example conditional content */}
      {activeTab === 'overview'  && <div>Overview content</div>}
      {activeTab === 'rides'     && <div>Rides content</div>}
      {activeTab === 'drivers'   && <div>Drivers content</div>}
      {activeTab === 'landmarks' && <div>Landmarks content</div>}
    </div>
  );
}
