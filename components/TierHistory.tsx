'use client';

import { useState, useEffect } from 'react';

interface TierAchievement {
  id: string;
  tier: 'Bronze' | 'Silver' | 'Gold';
  achieved_at: string;
  cycle_rides: number;
  cycle_topups: number;
  reset_cycle_months: number;
  cycle_start: string;
}

interface TierHistoryProps {
  userId: string;
}

export default function TierHistory({ userId }: TierHistoryProps) {
  const [achievements, setAchievements] = useState<TierAchievement[]>([]);
  const [currentResetCycle, setCurrentResetCycle] = useState(3);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (showHistory) {
      loadTierHistory();
    }
  }, [userId, showHistory]);

  const loadTierHistory = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/loyalty-membership-system`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_tier_history',
          userId: userId
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setAchievements(result.achievements);
        setCurrentResetCycle(result.currentResetCycle);
      }
    } catch (error) {
      console.error('Error loading tier history:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateResetCycle = async (newCycle: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/loyalty-membership-system`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update_reset_cycle',
          userId: userId,
          newCycle: newCycle
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentResetCycle(newCycle);
        alert(`Reset cycle updated to ${newCycle} months`);
      }
    } catch (error) {
      console.error('Error updating reset cycle:', error);
      alert('Failed to update reset cycle');
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'Gold': return 'ri-vip-crown-fill';
      case 'Silver': return 'ri-medal-line';
      case 'Bronze': return 'ri-award-line';
      default: return 'ri-user-line';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Gold': return 'text-yellow-600 bg-yellow-50';
      case 'Silver': return 'text-gray-600 bg-gray-50';
      case 'Bronze': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <i className="ri-history-line text-gray-400"></i>
            <h3 className="font-semibold text-gray-900">Tier History</h3>
          </div>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="text-orange-600 hover:text-orange-700 transition-colors"
          >
            <i className={`ri-arrow-${showHistory ? 'up' : 'down'}-s-line`}></i>
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="p-4 space-y-4">
          {/* Reset Cycle Settings */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Reset Cycle Settings</h4>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Current cycle:</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => updateResetCycle(3)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    currentResetCycle === 3 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  3 months
                </button>
                <button
                  onClick={() => updateResetCycle(6)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    currentResetCycle === 6 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  6 months
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Tiers reset every {currentResetCycle} months to maintain active engagement
            </p>
          </div>

          {/* Achievement History */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-100 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : achievements.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Achievement History</h4>
              {achievements.map((achievement, index) => (
                <div key={achievement.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTierColor(achievement.tier)}`}>
                        <i className={`${getTierIcon(achievement.tier)} text-lg`}></i>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-900">{achievement.tier} Member</h5>
                        <p className="text-sm text-gray-600">
                          Achieved {formatDateTime(achievement.achieved_at)}
                        </p>
                      </div>
                    </div>
                    {index === 0 && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center bg-gray-50 rounded-lg p-3">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{achievement.cycle_rides}</p>
                      <p className="text-xs text-gray-600">Rides</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{achievement.cycle_topups}</p>
                      <p className="text-xs text-gray-600">Top-ups</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{achievement.reset_cycle_months}mo</p>
                      <p className="text-xs text-gray-600">Cycle</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>Cycle started: {formatDate(achievement.cycle_start)}</span>
                    <span>Duration: {achievement.reset_cycle_months} months</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <i className="ri-trophy-line text-4xl text-gray-300 mb-2"></i>
              <p className="text-gray-500">No tier achievements yet</p>
              <p className="text-xs text-gray-400 mt-1">Complete rides and top-ups to unlock tiers</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
