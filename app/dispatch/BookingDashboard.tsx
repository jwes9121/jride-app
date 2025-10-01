"use client";
import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Booking } from '@/types/booking'

interface BookingDashboardProps {
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  onCancelBooking: (bookingId: string) => void;
}

export default function BookingDashboard({
  bookings,
  onSelectBooking,
  onCancelBooking,
}: BookingDashboardProps) {
  const [pendingBookings, setPendingBookings] = useState<Booking[]>(bookings || []);
  const supabase = createClientComponentClient();

  useEffect(() => {
    setPendingBookings(bookings || []);
  }, [bookings]);

  const handleCancelBooking = (bookingId: string) => {
    onCancelBooking(bookingId);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Pending Bookings</h2>
      {pendingBookings.length === 0 ? (
        <p>No pending bookings.</p>
      ) : (
        <ul className="space-y-3">
          {pendingBookings.map((b) => (
            <li key={b.id} className="p-3 border rounded-lg shadow-sm bg-white">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{b.customer_name}</p>
                  <p className="text-sm text-gray-600">
                    {b.pickup_location} â†’ {b.dropoff_location}
                  </p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => onSelectBooking(b)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleCancelBooking(b.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}





