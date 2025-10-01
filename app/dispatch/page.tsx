'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Ride = {
  id: string;
  user_id: string;
  pickup: { address: string };
  dropoff: { address: string };
  status: 'pending' | 'assigned' | 'enroute' | 'completed' | 'cancelled';
  created_at: string;
};

export default function DispatchPage() {
  const supabase = getSupabaseClient();
  const [rides, setRides] = useState<Ride[]>([]);
  const [meIsDispatcher, setMeIsDispatcher] = useState(false);

  useEffect(() => {
    (async () => {
      // Verify if current user is in dispatcher_users table
      const { data: auth } = await supabase.auth.getSession();
      const uid = auth.session?.user?.id;
      if (!uid) return;

      const { data: who } = await supabase.from('dispatcher_users').select('*').eq('user_id', uid).maybeSingle();
      const ok = Boolean(who);
      setMeIsDispatcher(ok);
      if (ok) {
        await loadAllRides();
        subscribeRides();
      }
    })();

    // realtime updates (optional)
    const subscribeRides = () => {
      const channel = supabase
        .channel('rides-feed')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => loadAllRides())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    };

    async function loadAllRides() {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .in('status', ['pending', 'assigned', 'enroute'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error) setRides((data || []) as Ride[]);
    }
  }, []);

  const updateStatus = async (id: string, status: Ride['status']) => {
    await supabase.from('rides').update({ status }).eq('id', id);
  };

  if (!meIsDispatcher) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <h1 className="text-2xl font-bold">Dispatcher</h1>
        <p className="text-gray-600 mt-2">You don’t have dispatcher access. Ask admin to add your user_id to <code>dispatcher_users</code>.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-4">Live Ride Requests</h1>
      <div className="grid gap-3">
        {rides.map((r) => (
          <div key={r.id} className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="text-sm">
              <div className="flex justify-between">
                <div className="font-semibold">{r.pickup?.address} → {r.dropoff?.address}</div>
                <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">{r.status}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => updateStatus(r.id, 'assigned')} className="px-3 py-2 rounded bg-amber-600 text-white text-sm">Assign</button>
              <button onClick={() => updateStatus(r.id, 'enroute')} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm">En-route</button>
              <button onClick={() => updateStatus(r.id, 'completed')} className="px-3 py-2 rounded bg-green-600 text-white text-sm">Complete</button>
              <button onClick={() => updateStatus(r.id, 'cancelled')} className="px-3 py-2 rounded bg-red-600 text-white text-sm">Cancel</button>
            </div>
          </div>
        ))}
        {rides.length === 0 && <div className="text-gray-500">No active rides.</div>}
      </div>
    </div>
  );
}
