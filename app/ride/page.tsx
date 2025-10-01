'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import LocationInput, { LocationValue } from '@/components/LocationInput';

export default function RidePage() {
  const supabase = getSupabaseClient();
  const [userId, setUserId] = useState<string | null>(null);

  const [pickup, setPickup] = useState<LocationValue | null>(null);
  const [dropoff, setDropoff] = useState<LocationValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [rides, setRides] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id || null;
      setUserId(uid);
      if (uid) await loadMyRides(uid);
    })();
  }, []);

  const loadMyRides = async (uid: string) => {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(10);
    if (!error) setRides(data || []);
  };

  const createRide = async () => {
    if (!userId) {
      alert('Please sign in first.');
      return;
    }
    if (!pickup || !dropoff) {
      alert('Please select pickup and dropoff.');
      return;
    }
    setLoading(true);
    const payload = {
      user_id: userId,
      pickup,
      dropoff,
      status: 'pending',
      payment_method: 'cash' as const,
    };
    const { error } = await supabase.from('rides').insert(payload);
    setLoading(false);
    if (error) {
      console.error(error);
      alert(`Failed to book ride: ${error.message}`);
      return;
    }
    alert('Ride requested!');
    await loadMyRides(userId);
    setPickup(null);
    setDropoff(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Book a Ride</h1>

      <div className="bg-white rounded-xl p-4 shadow border space-y-4 max-w-xl">
        <LocationInput
          label="Pickup"
          placeholder="Where are you?"
          value={pickup?.address || ''}
          onChange={(loc) => setPickup(loc)}
        />
        <LocationInput
          label="Dropoff"
          placeholder="Where to?"
          value={dropoff?.address || ''}
          onChange={(loc) => setDropoff(loc)}
        />

        <button
          onClick={createRide}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 text-white py-3 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Requesting…' : 'Request Ride'}
        </button>
      </div>

      <div className="max-w-xl">
        <h2 className="text-lg font-semibold mt-6 mb-2">My Recent Rides</h2>
        <div className="space-y-2">
          {rides.map((r) => (
            <div key={r.id} className="bg-white rounded-xl p-3 border shadow-sm">
              <div className="text-sm">
                <div><span className="font-medium">Status:</span> {r.status}</div>
                <div><span className="font-medium">Pickup:</span> {r.pickup?.address}</div>
                <div><span className="font-medium">Dropoff:</span> {r.dropoff?.address}</div>
                <div className="text-xs text-gray-500 mt-1">{new Date(r.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
          {rides.length === 0 && <div className="text-gray-500 text-sm">No rides yet.</div>}
        </div>
      </div>
    </div>
  );
}
