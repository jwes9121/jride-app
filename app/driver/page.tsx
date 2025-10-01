"use client";
import React, { useState, useEffect } from 'react';
import BottomNavigation from '@/components/BottomNavigation';

export default function DriverPage() {
  const [activeTab, setActiveTab] = useState('driver');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4">
        <h1 className="text-xl font-bold">Driver Dashboard</h1>
        {/* Driver dashboard content goes here */}
      </div>

      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}





