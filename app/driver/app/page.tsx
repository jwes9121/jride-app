"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/** ---- Types ---- */
type Booking = {
  id: string | number;
  driver_id?: string | number | null;
  status?: string | null;
  created_at?: string;
  [key: string]: any;
};

type BookingRow = {
  driver_id?: string | number | null;
  status?: string | null;
  [key: string]: any;
};

/** ---- Supabase browser client ---- */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function DriverAppPage() {
  // Whatever identifies the current driver. Replace with your actual source (e.g., session).
  const [driverId, setDriverId] = useState<string | number | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Example: load driverId from localStorage/session/etc. (optional; adjust to your app)
  useEffect(() => {
    try {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem("driver_id") : null;
      if (stored) setDriverId(isNaN(Number(stored)) ? stored : Number(stored));
    } catch {}
  }, []);

  /** Load the current booking for this driver (wrap in useCallback so it’s safe in deps) */
  const loadBooking = useCallback(async () => {
    setLoading(true);
    setErr(null);

    // Query the latest booking for this driver (adjust table/filters as needed)
    let query = supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(1);
    if (driverId != null) {
      query = supabase.from("bookings").select("*").eq("driver_id", driverId).order("created_at", { ascending: false }).limit(1);
    }

    const { data, error } = await query;
    if (error) {
      setErr(error.message);
      setBooking(null);
    } else {
      setBooking((data ?? [])[0] ?? null);
    }

    setLoading(false);
  }, [driverId]);

  /** Subscribe to booking changes for realtime refresh */
  useEffect(() => {
    // kick off an initial load; ignore its Promise
    void loadBooking();

    const ch = supabase
      .channel("driver-app-booking")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          // Cast payload.new so TS knows about driver_id/status
          const row = (payload?.new ?? {}) as Partial<BookingRow>;
          const driverIdStr = String(driverId ?? "");
          const rowDriverStr = String(row.driver_id ?? "");
          if (rowDriverStr === driverIdStr || row.status === "pending") {
            void loadBooking();
          }
        }
      )
      .subscribe();

    // cleanup must be sync (return void), NOT a Promise
    return () => {
      void ch.unsubscribe(); // ignore Promise
      // or: void supabase.removeChannel(ch);
    };
  }, [driverId, loadBooking]);

  const title = useMemo(() => "Driver App", []);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">{title}</h1>

      {err && <p className="text-sm text-red-600">Error: {err}</p>}
      {loading && <p className="text-sm text-gray-500">Loading booking…</p>}

      {!loading && !err && (
        <section className="border rounded-md p-4">
          <h2 className="text-lg font-medium mb-2">Current Booking</h2>
          {booking ? (
            <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-x-auto">
{JSON.stringify(booking, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-gray-600">No active booking.</p>
          )}
        </section>
      )}
    </main>
  );
}
