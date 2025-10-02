"use client";

import { useState } from "react";

interface RideShareConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (accepted: boolean) => void;
  driverName: string;
  pickupLocation: string;
  dropoffLocation: string;
  fare: number;
}

export default function RideShareConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  driverName,
  pickupLocation,
  dropoffLocation,
  fare,
}: RideShareConfirmationModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async (accepted: boolean) => {
    setLoading(true);
    await onConfirm(accepted);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Confirm Ride Share</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>{"Driver's name"}: {driverName}</p>
          <p>Pickup: {pickupLocation}</p>
          <p>Dropoff: {dropoffLocation}</p>
          <p>Fare: ₱{fare}</p>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => handleConfirm(true)}
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Processing..." : "Confirm Ride"}
          </button>
          <button
            onClick={() => handleConfirm(false)}
            disabled={loading}
            className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
