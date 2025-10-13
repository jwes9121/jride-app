import type { Metadata } from "next";
import MapClient from "@/components/MapClient";

export const metadata: Metadata = { title: "Tricycle Rideshare · JRide" };

export default function RidesharePage() {
  // Keep this page as a server component; it only renders the client MapClient
  return (
    <div className="min-h-screen bg-gray-50 pb-20" style={{ padding: "1rem" }}>
      <h1 className="text-xl mb-3">Tricycle Rideshare</h1>
      <MapClient
        markers={[
          { lat: 16.8133, lng: 121.1187, label: "JRide HQ" },
        ]}
      />
    </div>
  );
}
