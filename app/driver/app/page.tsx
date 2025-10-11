// 1) Wrap loadBooking in useCallback so it’s stable and can be in deps
const loadBooking = useCallback(async () => {
  // ... keep your existing logic here ...
  // e.g.
  // const { data, error } = await supabase.from("bookings").select("*").eq("driver_id", driverId).limit(1);
  // if (!error && data) setBooking(data[0] ?? null);
}, [/* put the variables loadBooking actually uses here, e.g. supabase, driverId, setBooking */]);

// 2) Corrected effect: starts async work with `void` and returns a sync cleanup
useEffect(() => {
  // kick off the async work; don’t return its Promise
  void loadBooking();

  const ch = supabase
    .channel("driver-app-booking")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bookings" },
      () => { void loadBooking(); }
    )
    .subscribe();

  // cleanup MUST return void (NOT a Promise)
  return () => { void ch.unsubscribe(); };
}, [loadBooking]); // include loadBooking to satisfy react-hooks/exhaustive-deps
