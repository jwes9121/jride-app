'use client';

import { useState, useEffect } from 'react';

interface DispatcherPerformanceOverviewProps {
  town: string;
}

interface DriverPerformance {
  id: string;
  name: string;
  rating: number;
  totalRatings: number;
  monthlyTrips: number;
  monthlyEarnings: number;
  completionRate: number;
  performanceStatus: 'excellent' | 'good' | 'warning' | 'critical';
  flagged: boolean;
  flagReason: string;
}

export default function DispatcherPerformanceOverview({ town }: DispatcherPerformanceOverviewProps) {
  const [overview, setOverview] = useState<any>(null);
  const [topPerformers, setTopPerformers] = useState<DriverPerformance[]>([]);
  const [bottomPerformers, setBottomPerformers] = useState<DriverPerformance[]>([]);
  const [allDrivers, setAllDrivers] = useState<DriverPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'top' | 'flagged'>('overview');

  useEffect(() => {
    loadPerformanceOverview();
  }, [town]);

  const loadPerformanceOverview = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/driver-performance-monitoring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_dispatcher_performance_overview',
          town: town
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setOverview(result.overview);
        setTopPerformers(result.topPerformers);
        setBottomPerformers(result.bottomPerformers);
        setAllDrivers(result.allDrivers);
      }
    } catch (error) {
      console.error('Error loading performance overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return 'ri-trophy-fill';
      case 'good': return 'ri-thumb-up-fill';
      case 'warning': return 'ri-alert-fill';
      case 'critical': return 'ri-error-warning-fill';
      default: return 'ri-user-line';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <i 
        key={i} 
        className={`ri-star-${i < rating ? 'fill' : 'line'} text-yellow-400`}
      ></i>
    ));
  };

  const flaggedDrivers = allDrivers.filter(d => d.flagged);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Driver Performance Overview</h3>
            <p className="text-sm text-gray-600">{town} - Last 30 Days</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <i className="ri-dashboard-line text-blue-600 text-xl"></i>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{overview?.totalDrivers || 0}</p>
            <p className="text-sm text-blue-800">Total Drivers</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{overview?.excellentDrivers || 0}</p>
            <p className="text-sm text-green-800">Excellent</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{overview?.flaggedDrivers || 0}</p>
            <p className="text-sm text-red-800">Flagged</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{overview?.averageRating?.toFixed(1) || '0.0'}</p>
            <p className="text-sm text-yellow-800">Avg Rating</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 border-b border-gray-200">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'overview'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Top Performers
          </button>
          <button
            onClick={() => setActiveTab('flagged')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative ${
              activeTab === 'flagged'
                ? 'bg-red-500 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Flagged Drivers
            {flaggedDrivers.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {flaggedDrivers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 mb-3">Top 5 Performers</h4>
            {topPerformers.length > 0 ? (
              <div className="space-y-3">
                {topPerformers.map((driver, index) => (
                  <div key={driver.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-gray-900">{driver.name}</h5>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(driver.performanceStatus)}`}>
                          <i className={`${getStatusIcon(driver.performanceStatus)} mr-1`}></i>
                          {driver.performanceStatus}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          {renderStars(Math.round(driver.rating))}
                          <span className="ml-1">{driver.rating.toFixed(1)}</span>
                        </div>
                        <span>{driver.monthlyTrips} trips</span>
                        <span>₱{driver.monthlyEarnings}</span>
                        <span>{driver.completionRate}% completion</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <i className="ri-user-line text-4xl mb-2"></i>
                <p>No driver data available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'flagged' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-red-900 mb-3">Drivers Requiring Attention</h4>
            {flaggedDrivers.length > 0 ? (
              <div className="space-y-3">
                {flaggedDrivers.map((driver) => (
                  <div key={driver.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-red-900">{driver.name}</h5>
                      <div className="flex items-center space-x-1 text-red-600">
                        <i className="ri-flag-fill"></i>
                        <span className="text-xs font-medium">FLAGGED</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-2 text-sm text-red-700">
                      <div className="flex items-center space-x-1">
                        {renderStars(Math.round(driver.rating))}
                        <span className="ml-1">{driver.rating.toFixed(1)}</span>
                      </div>
                      <span>{driver.monthlyTrips} trips</span>
                      <span>{driver.completionRate}% completion</span>
                    </div>
                    
                    <div className="bg-white p-3 rounded border border-red-200">
                      <p className="text-sm text-red-800">
                        <i className="ri-alert-line mr-2"></i>
                        {driver.flagReason}
                      </p>
                    </div>

                    <div className="flex space-x-2 mt-3">
                      <button className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors">
                        Review Performance
                      </button>
                      <button className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 transition-colors">
                        Send Warning
                      </button>
                      <button className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors">
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-green-600">
                <i className="ri-checkbox-circle-line text-4xl mb-2"></i>
                <p className="font-semibold">All drivers performing well!</p>
                <p className="text-sm text-gray-600">No performance issues to address</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
