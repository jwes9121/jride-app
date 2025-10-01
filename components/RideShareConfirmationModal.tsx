
'use client';

import { useState } from 'react';

interface RideShareConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rideId: string, approved: boolean) => void;
  ride: any;
  pendingPassenger: any;
}

export default function RideShareConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  ride,
  pendingPassenger
}: RideShareConfirmationModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !ride || !pendingPassenger) return null;

  const handleConfirm = async (approved: boolean) => {
    setLoading(true);
    await onConfirm(ride.id, approved);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <i className="ri-group-line text-2xl text-blue-600"></i>
          </div>
          <h3 className="text-xl font-bold">Ride-Share Request</h3>
          <p className="text-sm text-gray-600 mt-2">
            Driver found another passenger going the same direction
          </p>
        </div>

        {/* Current Ride Info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Your Current Ride:</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center space-x-2">
              <i className="ri-map-pin-line text-green-500"></i>
              <span>{ride?.pickup_location}</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="ri-flag-line text-red-500"></i>
              <span>{ride?.destination}</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="ri-money-dollar-circle-line text-gray-400"></i>
              <span className="font-semibold text-orange-600">₱{ride?.fare_amount}</span>
            </div>
          </div>
        </div>

        {/* New Passenger Info */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <div className="text-sm font-medium text-blue-700 mb-2">Potential Co-Passenger:</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center space-x-2">
              <i className="ri-user-line text-blue-500"></i>
              <span className="font-medium">{pendingPassenger?.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="ri-map-pin-line text-green-500"></i>
              <span>{pendingPassenger?.pickup}</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="ri-flag-line text-red-500"></i>
              <span>{pendingPassenger?.destination}</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="ri-money-dollar-circle-line text-gray-400"></i>
              <span className="font-semibold text-blue-600">₱{pendingPassenger?.fare}</span>
            </div>
          </div>
        </div>

        {/* Route Compatibility Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
          <div className="flex items-center space-x-2">
            <i className="ri-route-line text-green-600"></i>
            <span className="text-sm font-medium text-green-800">Route Compatible</span>
          </div>
          <p className="text-xs text-green-700 mt-1">
            The driver confirmed this passenger's route is along your direction
          </p>
        </div>

        {/* Decision Required */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
          <div className="flex items-center space-x-2">
            <i className="ri-question-line text-orange-600"></i>
            <span className="text-sm font-medium text-orange-800">Your Approval Required</span>
          </div>
          <p className="text-xs text-orange-700 mt-1">
            The driver is asking for your verbal approval to add this passenger
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleConfirm(true)}
            disabled={loading}
            className="w-full bg-green-500 text-white py-4 rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <i className="ri-check-line"></i>
            <span>{loading ? 'Processing...' : 'Approve Ride-Share'}</span>
          </button>
          
          <button
            onClick={() => handleConfirm(false)}
            disabled={loading}
            className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
          >
            <i className="ri-close-line"></i>
            <span>Decline Share</span>
          </button>
          
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full bg-gray-200 text-gray-800 py-2 rounded-xl font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            If declined, the other passenger will be rerouted to another driver
          </p>
        </div>
      </div>
    </div>
  );
}
