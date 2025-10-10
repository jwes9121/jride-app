'use client';

import * as React from 'react';
import BottomNavigation from '@/components/BottomNavigation';

export default function AdminPage() {
  const [activeTab, setActiveTab] = React.useState<string>('overview');

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold mb-4">Admin Dashboard</h1>

      <BottomNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        // Optional: override the tabs shown in the nav
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'rides', label: 'Rides' },
          { key: 'drivers', label: 'Drivers' },
          { key: 'landmarks', label: 'Landmarks' },
        ]}
      />

      <section className="mt-6">
        {activeTab === 'overview' && <div>Overview content…</div>}
        {activeTab === 'rides' && <div>Rides content…</div>}
        {activeTab === 'drivers' && <div>Drivers content…</div>}
        {activeTab === 'landmarks' && <div>Landmarks content…</div>}
      </section>
    </main>
  );
}
