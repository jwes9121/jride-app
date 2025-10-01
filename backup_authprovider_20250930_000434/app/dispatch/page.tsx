"use client";
import React, { useState, useEffect } from 'react';
import BookingForm from '@/components/BookingForm'
import BookingDashboard from '@/app/dispatch/BookingDashboard'
import { Booking } from '@/types/booking'

export default function DispatchPage() {
  // âœ… Explicitly type state to avoid "never[]" errors
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [activeTab, setActiveTab] = useState<'form' | 'dashboard'>('form')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Dispatch Management</h1>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('form')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'form'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            New Booking
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'dashboard'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Dashboard
          </button>
        </div>

        {/* Conditional Render */}
        {activeTab === 'form' && (
          <BookingForm
            onBookingCreated={(booking) => {
              // âœ… Correctly updates with typed state
              setPendingBookings((prev) => [...prev, booking])
              setActiveTab('dashboard')
            }}
          />
        )}

        {activeTab === 'dashboard' && (
          <BookingDashboard
            bookings={pendingBookings}
            onSelectBooking={(booking) => setSelectedBooking(booking)}
            onCancelBooking={(bookingId) => {
              setPendingBookings((prev) =>
                prev.filter((b) => b.id !== bookingId)
              )
              setSelectedBooking(null)
            }}
          />
        )}
      </div>
    </div>
  )
}





