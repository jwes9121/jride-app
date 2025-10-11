import LocationInputSelectAdapter from "@/components/LocationInputSelectAdapter";
// (keep your other imports)

{/* …inside your JSX… */}
<LocationInputSelectAdapter
  label="Pickup Location"
  value={pickup?.address || ""}
  onLocationSelect={(location) => setPickup(location)}
  placeholder="Where are you?"
  icon="ri-map-pin-line"
  iconColor="blue"
/>
