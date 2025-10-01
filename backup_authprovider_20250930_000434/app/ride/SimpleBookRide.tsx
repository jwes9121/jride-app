"use client";

import { useState } from "react";
import LocationInput from "@/components/LocationInput";

interface Location {
  address: string;
  lat: number;
  lng: number;
  municipality?: string;
  barangay?: string;
  type?: string;
}

export default function SimpleBookRide() {
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);

  const handleConfirm = () => {
    if (!pickup || !dropoff) {
      alert("Please select both pickup and dropoff locations.");
      return;
    }
    console.log("Booking ride from", pickup, "to", dropoff);
    // later: call backend API or Supabase insert
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
      {/* Pickup Location */}
      <LocationInput
        label="Pickup Location"
        value={pickup?.address || ""}
        onLocationSelect={(location) => setPickup(location)}
        placeholder="Where are you?"
        icon="ri-map-pin-line"
        iconColor="blue"
      />

      {/* Dropoff Location */}
      <LocationInput
        label="Drop-off Location"
        value={dropoff?.address || ""}
        onLocationSelect={(location) => setDropoff(location)}
        placeholder="Where to?"
        icon="ri-flag-line"
        iconColor="red"
      />

      {/* Confirm Button */}
      <button
        onClick={handleConfirm}
        className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition"
      >
        Confirm Ride
      </button>
    </div>
  );
}


