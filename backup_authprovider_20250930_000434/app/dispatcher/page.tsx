"use client";
import React, { useState, useEffect } from 'react';
import BottomNavigation from '@/components/BottomNavigation';

export default function DispatcherPage() {
  const [activeTab, setActiveTab] = useState('dispatcher');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4">
        <h1 className="text-xl font-bold">Dispatcher Dashboard</h1>
        {/* Dispatcher dashboard content goes here */}
      </div>

      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}





