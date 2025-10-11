"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNavigation from '@/components/BottomNavigation';
import OfflineIndicator from '@/components/OfflineIndicator';
import RideShareConfirmationModal from '@/components/RideShareConfirmationModal';

interface TricycleRide {
  id: string;
  passenger_name: string;
  pickup_location: string;
  destination: string;
  fare_amount: number;
  ride_type: 'private' | 'ride_share';
  max_passengers: number;
  current_passengers: number;
  status: 'pending' | 'driver_assigned' | 'passenger_a_pickup' | 'ride_share_pending' | 'ride_share_approved' | 'ride_share_declined' | 'passenger_b_pickup' | 'ride_ongoing' | 'completed' | 'cancelled';
  driver_id?: string;
  driver_name?: string;
  shared_passengers?: Array<{
    name: string;
    pickup: string;
    destination: string;
    fare: number;
    status: string;
  }>;
  created_at: string;
  estimated_arrival?: string;
  ride_share_savings?: number;
}

export default function TricycleRideSharePage() {
  const [activeTab, setActiveTab] = useState('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [rides, setRides] = useState<TricycleRide[]>([]);
  const [userRole, setUserRole] = useState<'passenger' | 'driver'>('passenger');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedRide, setSelectedRide] = useState<TricycleRide | null>(null);
  const [pendingShareRequest, setPendingShareRequest] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Booking form state
  const [bookingData, setBookingData] = useState({
    pickup_location: '',
    destination: '',
    ride_type: 'private' as 'private' | 'ride_share',
    fare_amount: 50
  });

  useEffect(() => {
    fetchRides();
    const interval = setInterval(fetchRides, 30000);
    return () => clearInterval(interval);
  }, [userRole]);

  const fetchRides = async () => {
    try {
      const token = localStorage.getItem('j-ride-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tricycle-rideshare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'get_rides',
          user_role: userRole
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setRides(data.rides || []);
      }
    } catch (error) {
      console.error('Error fetching rides:', error);
    }
  };

  const bookRide = async () => {
    if (!bookingData.pickup_location || !bookingData.destination) {
      alert('Please fill in pickup and destination locations');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('j-ride-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tricycle-rideshare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'book_ride',
          ...bookingData,
          passenger_name: 'Sample Passenger' // In real app, get from user profile
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setShowBookingForm(false);
        setBookingData({
          pickup_location: '',
          destination: '',
          ride_type: 'private',
          fare_amount: 50
        });
        await fetchRides();
        alert('Ride booked successfully! Finding nearest driver...');
      } else {
        alert(data.message || 'Failed to book ride');
      }
    } catch (error) {
      console.error('Error booking ride:', error);
      alert('Failed to book ride');
    }
    setLoading(false);
  };

  const updateRideStatus = async (rideId: string, status: string, extraData?: any) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('j-ride-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tricycle-rideshare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'update_ride_status',
          ride_id: rideId,
          status: status,
          user_role: userRole,
          ...extraData
        })
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchRides();
        if (data.message) {
          alert(data.message);
        }
      } else {
        alert(data.message || 'Failed to update ride status');
      }
    } catch (error) {
      console.error('Error updating ride status:', error);
      alert('Failed to update ride status');
    }
    setLoading(false);
  };

  const initiateRideShare = async (rideId: string) => {
    const ride = rides.find(r => r.id === rideId);
    if (!ride) return;

    // Check if tricycle has capacity
    if (ride.current_passengers >= ride.max_passengers) {
      alert('This tricycle is at full capacity');
      return;
    }

    // Driver initiates ride-share opportunity
    setLoading(true);
    try {
      const token = localStorage.getItem('j-ride-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tricycle-rideshare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'initiate_ride_share',
          ride_id: rideId,
          potential_passenger: {
            name: 'Passenger B', // In real app, get from matching system
            pickup: 'Similar Route Pickup',
            destination: 'Similar Route Destination',
            fare: Math.floor(bookingData.fare_amount * 0.8) // 20% discount for ride-share
          }
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Show confirmation modal to first passenger
        setSelectedRide(ride);
        setPendingShareRequest(data.potential_passenger);
        setShowConfirmationModal(true);
      } else {
        alert(data.message || 'No matching passengers found for ride-share');
      }
    } catch (error) {
      console.error('Error initiating ride-share:', error);
      alert('Failed to initiate ride-share');
    }
    setLoading(false);
  };

  const handleRideShareDecision = async (rideId: string, approved: boolean) => {
    setShowConfirmationModal(false);
    
    if (approved) {
      await updateRideStatus(rideId, 'ride_share_approved', {
        share_approved: true,
        new_passenger: pendingShareRequest
      });
    } else {
      // Decline and reroute to another driver
      await updateRideStatus(rideId, 'ride_share_declined', {
        share_approved: false,
        reroute_reason: 'First passenger declined ride-share'
      });
    }
    
    setPendingShareRequest(null);
    setSelectedRide(null);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'driver_assigned': 'bg-blue-100 text-blue-800',
      'passenger_a_pickup': 'bg-purple-100 text-purple-800',
      'ride_share_pending': 'bg-orange-100 text-orange-800',
      'ride_share_approved': 'bg-teal-100 text-teal-800',
      'ride_share_declined': 'bg-red-100 text-red-800',
      'passenger_b_pickup': 'bg-cyan-100 text-cyan-800',
      'ride_ongoing': 'bg-green-100 text-green-800',
      'completed': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts = {
      'pending': 'Finding Driver',
      'driver_assigned': 'Driver Assigned',
      'passenger_a_pickup': 'Passenger A Pickup',
      'ride_share_pending': 'Ride-Share Pending',
      'ride_share_approved': 'Ride-Share Approved',
      'ride_share_declined': 'Ride-Share Declined',
      'passenger_b_pickup': 'Passenger B Pickup',
      'ride_ongoing': 'Ride Ongoing',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return texts[status as keyof typeof texts] || status.toUpperCase();
  };

  const canInitiateRideShare = (ride: TricycleRide) => {
    return userRole === 'driver' &&
           ride.current_passengers < ride.max_passengers &&
           ['passenger_a_pickup', 'ride_ongoing'].includes(ride.status) &&
           ride.ride_type === 'ride_share';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <OfflineIndicator />
      
      {/* Header */}
      <div className="bg-white p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <button className="w-10 h-10 flex items-center justify-center">
                <i className="ri-arrow-left-line text-xl"></i>
              </button>
            </Link>
            <h1 className="text-xl font-bold">Tricycle Ride-Share</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="passenger">Passenger</option>
              <option value="driver">Driver</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Role-specific Header */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              userRole === 'passenger' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              <i className={`text-xl ${
                userRole === 'passenger' ? 'ri-user-line text-blue-600' : 'ri-steering-2-line text-green-600'
              }`}></i>
            </div>
            <div>
              <h2 className="font-semibold capitalize">{userRole} Dashboard</h2>
              <p className="text-sm text-gray-600">
                {userRole === 'passenger' ? 'Choose private or shared rides' : 'Manage rides and approve ride-shares'}
              </p>
            </div>
          </div>
        </div>

        {/* Book Ride Button for Passengers */}
        {userRole === 'passenger' && (
          <div className="mb-6">
            <button
              onClick={() => setShowBookingForm(true)}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 flex items-center justify-center space-x-2"
            >
              <i className="ri-add-line text-xl"></i>
              <span>Book Tricycle Ride</span>
            </button>
          </div>
        )}

        {/* Rides List */}
        <div className="space-y-4">
          <h3 className="font-semibold">
            {userRole === 'passenger' ? 'My Rides' : 'Active Rides'}
          </h3>
          
          {rides.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <i className="ri-roadster-line text-2xl text-gray-400"></i>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">No Rides</h3>
              <p className="text-sm text-gray-600">
                {userRole === 'passenger' ? 'Your rides will appear here' : 'No active rides to manage'}
              </p>
            </div>
          ) : (
            rides.map(ride => (
              <div key={ride.id} className="bg-white rounded-xl p-4 border">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold">{ride.passenger_name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ride.status)}`}>
                        {getStatusText(ride.status)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ride.ride_type === 'ride_share' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ride.ride_type === 'ride_share' ? 'RIDE-SHARE' : 'PRIVATE'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <i className="ri-map-pin-line text-green-500"></i>
                        <span>{ride.pickup_location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <i className="ri-flag-line text-red-500"></i>
                        <span>{ride.destination}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <i className="ri-group-line text-gray-400"></i>
                        <span>{ride.current_passengers}/{ride.max_passengers} passengers</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-600">â‚±{ride.fare_amount}</div>
                    {ride.ride_share_savings && (
                      <div className="text-xs text-green-600 font-medium">Save â‚±{ride.ride_share_savings}</div>
                    )}
                    <div className="text-xs text-gray-500">Ride #{ride.id.slice(-6)}</div>
                    {ride.estimated_arrival && (
                      <div className="text-xs text-gray-500 mt-1">
                        ETA: {new Date(ride.estimated_arrival).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Shared Passengers */}
                {ride.shared_passengers && ride.shared_passengers.length > 0 && (
                  <div className="bg-teal-50 rounded-lg p-3 mb-4">
                    <div className="text-sm font-medium text-teal-800 mb-2">Shared Passengers:</div>
                    <div className="space-y-1">
                      {ride.shared_passengers.map((passenger, index) => (
                        <div key={index} className="flex justify-between text-sm text-teal-700">
                          <span>{passenger.name}</span>
                          <span>â‚±{passenger.fare}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  {userRole === 'driver' && (
                    <>
                      {ride.status === 'pending' && (
                        <button
                          onClick={() => updateRideStatus(ride.id, 'driver_assigned')}
                          disabled={loading}
                          className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 disabled:bg-gray-300"
                        >
                          Accept Ride Request
                        </button>
                      )}
                      
                      {ride.status === 'driver_assigned' && (
                        <button
                          onClick={() => updateRideStatus(ride.id, 'passenger_a_pickup')}
                          disabled={loading}
                          className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 disabled:bg-gray-300"
                        >
                          Passenger A Pickup
                        </button>
                      )}

                      {canInitiateRideShare(ride) && (
                        <button
                          onClick={() => initiateRideShare(ride.id)}
                          disabled={loading}
                          className="w-full bg-teal-500 text-white py-3 rounded-xl font-semibold hover:bg-teal-600 disabled:bg-gray-300"
                        >
                          Initiate Ride-Share
                        </button>
                      )}
                      
                      {ride.status === 'ride_share_approved' && (
                        <button
                          onClick={() => updateRideStatus(ride.id, 'passenger_b_pickup')}
                          disabled={loading}
                          className="w-full bg-cyan-500 text-white py-3 rounded-xl font-semibold hover:bg-cyan-600 disabled:bg-gray-300"
                        >
                          Passenger B Pickup
                        </button>
                      )}

                      {['passenger_a_pickup', 'passenger_b_pickup'].includes(ride.status) && (
                        <button
                          onClick={() => updateRideStatus(ride.id, 'ride_ongoing')}
                          disabled={loading}
                          className="w-full bg-purple-500 text-white py-3 rounded-xl font-semibold hover:bg-purple-600 disabled:bg-gray-300"
                        >
                          Start Ride
                        </button>
                      )}
                      
                      {ride.status === 'ride_ongoing' && (
                        <button
                          onClick={() => updateRideStatus(ride.id, 'completed')}
                          disabled={loading}
                          className="w-full bg-emerald-500 text-white py-3 rounded-xl font-semibold hover:bg-emerald-600 disabled:bg-gray-300"
                        >
                          Complete Ride
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Book Tricycle Ride</h3>
              <button
                onClick={() => setShowBookingForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Location
                </label>
                <input
                  type="text"
                  value={bookingData.pickup_location}
                  onChange={(e) => setBookingData(prev => ({ ...prev, pickup_location: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter pickup location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination
                </label>
                <input
                  type="text"
                  value={bookingData.destination}
                  onChange={(e) => setBookingData(prev => ({ ...prev, destination: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter destination"
                />
              </div>

              {/* Ride Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Ride Type
                </label>
                <div className="space-y-3">
                  <button
                    onClick={() => setBookingData(prev => ({ ...prev, ride_type: 'private', fare_amount: 50 }))}
                    className={`w-full p-4 rounded-xl border-2 transition-colors ${
                      bookingData.ride_type === 'private'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <i className="ri-user-line text-orange-600"></i>
                        </div>
                        <div className="text-left">
                          <div className="font-semibold">Private Ride</div>
                          <div className="text-sm text-gray-600">Exclusive booking (default)</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">â‚±50</div>
                        <div className="text-xs text-gray-600">full fare</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setBookingData(prev => ({ ...prev, ride_type: 'ride_share', fare_amount: 40 }))}
                    className={`w-full p-4 rounded-xl border-2 transition-colors ${
                      bookingData.ride_type === 'ride_share'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <i className="ri-group-line text-green-600"></i>
                        </div>
                        <div className="text-left">
                          <div className="font-semibold">Ride-Share</div>
                          <div className="text-sm text-gray-600">Lower cost, may share ride</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">â‚±40</div>
                        <div className="text-xs text-green-600">save â‚±10</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Ride-Share Info */}
              {bookingData.ride_type === 'ride_share' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <i className="ri-information-line text-green-600"></i>
                    <span className="font-medium text-green-800">Ride-Share Benefits</span>
                  </div>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>â€¢ Save money on your ride</li>
                    <li>â€¢ Driver may pick up another passenger going the same direction</li>
                    <li>â€¢ You'll be asked for approval before anyone joins</li>
                    <li>â€¢ If you decline, they'll get another driver</li>
                  </ul>
                </div>
              )}

              <div className="space-y-3 pt-4">
                <button
                  onClick={bookRide}
                  disabled={loading || !bookingData.pickup_location || !bookingData.destination}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:bg-gray-300"
                >
                  {loading ? 'Booking...' : `Book ${bookingData.ride_type === 'ride_share' ? 'Ride-Share' : 'Private Ride'} - â‚±${bookingData.fare_amount}`}
                </button>
                
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
{/* Ride Share Confirmation Modal */}
<(RideShareConfirmationModal as any)
  isOpen={showConfirmationModal}
  onClose={() => setShowConfirmationModal(false)}
  ride={selectedRide}
  pendingPassenger={pendingShareRequest}

  /* Required by the modal’s type — provide safe fallbacks */
  driverName={selectedRide?.driverName ?? selectedRide?.driver?.name ?? "Driver"}
  pickupLocation={selectedRide?.pickup?.address ?? selectedRide?.pickupLocation ?? "Pickup location"}
  dropoffLocation={selectedRide?.dropoff?.address ?? selectedRide?.dropoffLocation ?? "Dropoff location"}
  fare={Number((selectedRide as any)?.fare ?? 0)}

  onConfirm={(accepted) => {
    if (!selectedRide?.id) return;
    handleRideShareDecision(selectedRide.id, accepted)
      .catch(err => console.error("Ride-share decision failed:", err));
  }}
/>


  /* ⬇️ Add the 4 required props with safe fallbacks */
  driverName={selectedRide?.driverName ?? selectedRide?.driver?.name ?? "Driver"}
  pickupLocation={selectedRide?.pickup?.address ?? selectedRide?.pickupLocation ?? "Pickup location"}
  dropoffLocation={selectedRide?.dropoff?.address ?? selectedRide?.dropoffLocation ?? "Dropoff location"}
  fare={Number((selectedRide as any)?.fare ?? 0)}

  onConfirm={(accepted) => {
    if (!selectedRide?.id) return;
    handleRideShareDecision(selectedRide.id, accepted)
      .catch(err => console.error("Ride-share decision failed:", err));
  }}
/>


      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}





